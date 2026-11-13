import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, nextTick, reactive } from 'vue'
import { z } from 'zod'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingForm from './BingForm.vue'
import type { BingFormExpose } from './BingForm.types'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingSelect from '../BingSelect/BingSelect.vue'
import BingTreeSelect from '../BingTreeSelect/BingTreeSelect.vue'

enableAutoUnmount(afterEach)

function getFormExpose(wrapper: ReturnType<typeof mount>) {
  return wrapper.getComponent(BingForm).vm as unknown as BingFormExpose
}

function getBodyOptions() {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.bing-select__option'))
}

function getBodyTreeNodes() {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.bing-tree-select__node'))
}

describe('BingForm', () => {
  it('maps Zod issues to form items and injects accessible error state', async () => {
    const wrapper = mount(
      defineComponent({
        components: { BingForm, BingFormItem, BingInput },
        setup() {
          const model = reactive({
            name: '',
          })
          const schema = z.object({
            name: z.string().min(1, 'Name is required'),
          })

          return { model, schema }
        },
        template: `
          <BingForm :model="model" :schema="schema">
            <BingFormItem prop="name" label="Name" required>
              <BingInput v-model="model.name" />
            </BingFormItem>
          </BingForm>
        `,
      }),
    )

    expect(wrapper.find('.bing-form-item__message-slot').exists()).toBe(true)
    expect(wrapper.find('.bing-form-item__message-text').exists()).toBe(false)
    expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined()

    await expect(getFormExpose(wrapper).validate()).resolves.toBe(false)
    await nextTick()

    const input = wrapper.get('input')

    expect(wrapper.text()).toContain('Name is required')
    expect(input.attributes('aria-invalid')).toBe('true')
    expect(input.attributes('aria-describedby')).toContain('message')
  })

  it('keeps a reserved message slot when validation text appears and clears', async () => {
    const wrapper = mount(
      defineComponent({
        components: { BingForm, BingFormItem, BingInput },
        setup() {
          const model = reactive({
            name: '',
          })
          const schema = z.object({
            name: z.string().min(1, 'Name is required'),
          })

          return { model, schema }
        },
        template: `
          <BingForm :model="model" :schema="schema">
            <BingFormItem prop="name" label="Name">
              <BingInput v-model="model.name" />
            </BingFormItem>
          </BingForm>
        `,
      }),
    )

    const form = getFormExpose(wrapper)

    expect(wrapper.find('.bing-form-item__message-slot').exists()).toBe(true)

    await expect(form.validate()).resolves.toBe(false)
    await nextTick()

    expect(wrapper.find('.bing-form-item__message-slot').exists()).toBe(true)
    expect(wrapper.text()).toContain('Name is required')

    form.clearValidate()
    await nextTick()

    expect(wrapper.find('.bing-form-item__message-slot').exists()).toBe(true)
    expect(wrapper.find('.bing-form-item__message-text').exists()).toBe(false)
    expect(wrapper.get('input').attributes('aria-describedby')).toBeUndefined()
  })

  it('renders both errors and help as whole sentences without splitting characters', async () => {
    const wrapper = mount(
      defineComponent({
        components: { BingForm, BingFormItem, BingInput },
        setup() {
          const model = reactive({
            name: '',
            description: '',
          })
          const schema = z.object({
            name: z.string().min(1, 'Name is required'),
            description: z.string(),
          })

          return { model, schema }
        },
        template: `
          <BingForm :model="model" :schema="schema">
            <BingFormItem prop="name" label="Name">
              <BingInput v-model="model.name" />
            </BingFormItem>
            <BingFormItem prop="description" label="Description" help="Up to 120 characters">
              <BingInput v-model="model.description" />
            </BingFormItem>
          </BingForm>
        `,
      }),
    )

    const helpMessage = wrapper
      .findAll('.bing-form-item__message')
      .find((message) => message.text().includes('Up to 120 characters'))

    expect(helpMessage?.get('.bing-form-item__message-text').element.childElementCount).toBe(0)

    await expect(getFormExpose(wrapper).validate()).resolves.toBe(false)
    await nextTick()

    const errorMessage = wrapper
      .findAll('.bing-form-item__message')
      .find((message) => message.text().includes('Name is required'))

    expect(errorMessage?.get('.bing-form-item__message-text').element.childElementCount).toBe(0)
    expect(errorMessage?.text()).toBe('Name is required')
  })

  it('does not flash a stale select validation error when focus moves into the option panel', async () => {
    const wrapper = mount(
      defineComponent({
        components: { BingForm, BingFormItem, BingSelect },
        setup() {
          const model = reactive({
            mood: null as string | null,
          })
          const schema = z.object({
            mood: z.string({ message: 'Please choose motion style' }),
          })
          const options = [
            { label: 'Aurora', value: 'aurora' },
            { label: 'Orbit', value: 'orbit' },
          ]

          return { model, options, schema }
        },
        template: `
          <BingForm :model="model" :schema="schema">
            <BingFormItem prop="mood" label="Motion style" required>
              <BingSelect v-model="model.mood" :options="options" />
            </BingFormItem>
          </BingForm>
        `,
      }),
      {
        attachTo: document.body,
      },
    )

    await wrapper.get('.bing-select__trigger').trigger('click')
    await nextTick()
    await nextTick()

    const firstOption = getBodyOptions()[0]

    expect(firstOption).toBeDefined()

    await wrapper.get('.bing-select__trigger').trigger('blur', {
      relatedTarget: firstOption,
    })
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).not.toContain('Please choose motion style')

    firstOption?.click()
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).not.toContain('Please choose motion style')
  })

  it('does not show stale tree select required errors while the panel is open', async () => {
    const frameCallbacks = new Map<number, FrameRequestCallback>()
    let frameId = 0

    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      const nextId = ++frameId
      frameCallbacks.set(nextId, callback)

      return nextId
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((id) => {
      frameCallbacks.delete(id)
    })
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(document.body)

    const wrapper = mount(
      defineComponent({
        components: { BingForm, BingFormItem, BingTreeSelect },
        setup() {
          const model = reactive({
            education: null as string | null,
          })
          const schema = z.object({
            education: z.string({ message: 'Choose an education level' }),
          })
          const options = [
            { label: 'Primary school', value: 'primary' },
            { label: 'University', value: 'university' },
          ]

          return { model, options, schema }
        },
        template: `
          <BingForm :model="model" :schema="schema">
            <BingFormItem prop="education" label="Education" required>
              <BingTreeSelect v-model="model.education" :options="options" />
            </BingFormItem>
          </BingForm>
        `,
      }),
      {
        attachTo: document.body,
      },
    )

    await wrapper.get('.bing-tree-select__trigger').trigger('click')
    await nextTick()
    await nextTick()

    await wrapper.get('.bing-tree-select__trigger').trigger('blur', {
      relatedTarget: null,
    })
    await nextTick()

    Array.from(frameCallbacks.values()).forEach((callback) => callback(performance.now()))
    frameCallbacks.clear()
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).not.toContain('Choose an education level')

    getBodyTreeNodes()[0]?.click()
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).not.toContain('Choose an education level')
  })

  it('validates nested paths and async refinements with safeParseAsync', async () => {
    const wrapper = mount(
      defineComponent({
        components: { BingForm, BingFormItem, BingInput },
        setup() {
          const model = reactive({
            profile: {
              email: 'taken@example.com',
            },
          })
          const schema = z.object({
            profile: z.object({
              email: z
                .string()
                .email('Email is invalid')
                .refine(async (value) => value !== 'taken@example.com', {
                  message: 'Email is already taken',
                }),
            }),
          })

          return { model, schema }
        },
        template: `
          <BingForm :model="model" :schema="schema">
            <BingFormItem prop="profile.email" label="Email">
              <BingInput v-model="model.profile.email" />
            </BingFormItem>
          </BingForm>
        `,
      }),
    )

    await expect(getFormExpose(wrapper).validateField('profile.email')).resolves.toBe(false)
    await nextTick()

    expect(wrapper.text()).toContain('Email is already taken')
  })

  it('clears validation and resets model values', async () => {
    const wrapper = mount(
      defineComponent({
        components: { BingForm, BingFormItem, BingInput },
        setup() {
          const model = reactive({
            name: 'Initial',
          })
          const schema = z.object({
            name: z.string().min(3, 'Name is too short'),
          })

          return { model, schema }
        },
        template: `
          <BingForm :model="model" :schema="schema">
            <BingFormItem prop="name" label="Name">
              <BingInput v-model="model.name" />
            </BingFormItem>
          </BingForm>
        `,
      }),
    )

    const input = wrapper.get('input')

    await input.setValue('No')
    await getFormExpose(wrapper).validate()
    await flushPromises()
    await nextTick()
    expect(wrapper.text()).toContain('Name is too short')

    getFormExpose(wrapper).resetFields()
    await nextTick()

    expect((input.element as HTMLInputElement).value).toBe('Initial')
    expect(wrapper.text()).not.toContain('Name is too short')
  })

  it('uses an inner responsive grid and clamps item span to configured columns', () => {
    const wrapper = mount(
      defineComponent({
        components: { BingForm, BingFormItem, BingInput },
        setup() {
          const model = reactive({
            name: '',
          })

          return { model }
        },
        template: `
          <BingForm :model="model" :columns="{ base: 1, sm: 2, xl: 5 }">
            <BingFormItem prop="name" label="Name" :span="{ sm: 4, xl: 5 }">
              <BingInput v-model="model.name" />
            </BingFormItem>
          </BingForm>
        `,
      }),
    )

    const layout = wrapper.get('.bing-form__layout')
    const itemStyle = wrapper.getComponent(BingFormItem).attributes('style') ?? ''

    expect(layout.classes()).toContain('bing-form__layout')
    expect(itemStyle).toContain('--bing-form-item-span-sm: 2')
    expect(itemStyle).toContain('--bing-form-item-span-lg: 2')
    expect(itemStyle).toContain('--bing-form-item-span-xl: 5')
  })
})
