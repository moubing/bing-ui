from pathlib import Path
from docx import Document
from openpyxl import Workbook, load_workbook
from pptx import Presentation

target = Path(__file__).resolve().parents[1] / 'public' / 'mock-files'
doc = Document()
doc.core_properties.author = 'Bing UI'
doc.core_properties.last_modified_by = 'Bing UI'
doc.add_heading('Bing UI 文件预览示例', 0)
doc.add_paragraph('这是随源码生成的虚构测试文档，不含真实成员、账号或业务数据。')
doc.add_paragraph('Office 文件由应用提供转换后的 PDF 或 HTML 预览；此文件用于下载和外部打开示例。')
doc.save(target / 'sample.docx')

book = Workbook()
book.properties.creator = 'Bing UI'
book.properties.lastModifiedBy = 'Bing UI'
sheet = book.active
sheet.title = '演示数据'
for row in [('项目', '状态', '数量'), ('示例任务 A', '待处理', 3), ('示例任务 B', '已完成', 5)]:
    sheet.append(row)
sheet.column_dimensions['A'].width = 24
sheet.column_dimensions['B'].width = 18
sheet.column_dimensions['C'].width = 12
book.save(target / 'sample.xlsx')

deck = Presentation()
deck.core_properties.author = 'Bing UI'
deck.core_properties.last_modified_by = 'Bing UI'
slide = deck.slides.add_slide(deck.slide_layouts[0])
slide.shapes.title.text = 'Bing UI 文件预览示例'
slide.placeholders[1].text = '虚构内容 · 用于下载与外部打开测试\n不含真实用户或业务信息'
deck.save(target / 'sample.pptx')

assert Document(target / 'sample.docx').paragraphs[0].text == 'Bing UI 文件预览示例'
assert load_workbook(target / 'sample.xlsx').active['C3'].value == 5
assert len(Presentation(target / 'sample.pptx').slides) == 1
print('三个自行生成的 Office 测试夹具均通过重新读取校验。')
