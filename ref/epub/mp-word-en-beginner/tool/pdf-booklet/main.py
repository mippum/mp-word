import fitz  # PyMuPDF
from math import ceil

# 총 페이지 수는 16의 배수 이어야 함. 최대 144 페이지. 96 페이지 추천.

# def booklet_order(pages):
#     # 총 페이지 n
#     n = len(pages)
#     order = []
#     for i in range(0, n//4):
#         left_front = i*2
#         right_front = n - 1 - i*2
#         left_back = i*2 + 1
#         right_back = n - 2 - i*2
#         order.extend([pages[left_front], pages[right_front],
#                       pages[left_back], pages[right_back]])
#     return order

def booklet_order(pages):

    # n = 32
    n = len(pages)

    order = []

    # a4_sheets = []
    # for a4_sheet_number in range(1, n//2 + 1):
    #     # a6_page
    #     # a4_sheet_number
    #     a4_sheets.append([
    #         [n, 1],
    #         [n-]
    #     ])
    #
    #     pass

    left_page, right_page = n, 1
    while right_page < left_page:
        order.extend([pages[left_page-1], pages[right_page-1]])
        order.extend([pages[left_page-3], pages[right_page+1]])
        order.extend([pages[left_page-5], pages[right_page+3]])
        order.extend([pages[left_page-7], pages[right_page+5]])

        order.extend([pages[right_page + 2], pages[left_page - 4]])
        order.extend([pages[right_page], pages[left_page-2]])
        order.extend([pages[right_page+6], pages[left_page-8]])
        order.extend([pages[right_page+4], pages[left_page-6]])

        left_page -= 8
        right_page += 8

    return order


def booklet_order16(pages):

    n = len(pages)

    order = []
    left_page, right_page = n, 1

    order.extend([pages[left_page - 1], pages[right_page - 1]])


    left_page, right_page = n, 1
    while right_page < left_page:
        order.extend([pages[left_page-1], pages[right_page-1]])
        order.extend([pages[left_page-3], pages[right_page+1]])
        order.extend([pages[left_page-5], pages[right_page+3]])
        order.extend([pages[left_page-7], pages[right_page+5]])

        order.extend([pages[right_page + 2], pages[left_page - 4]])
        order.extend([pages[right_page], pages[left_page-2]])
        order.extend([pages[right_page+6], pages[left_page-8]])
        order.extend([pages[right_page+4], pages[left_page-6]])

        left_page -= 8
        right_page += 8

    return order

def run():
    # 원본 A6 PDF 열기
    doc = fitz.open("input_a6.pdf")
    pages = list(range(len(doc)))
    # print(len(doc))

    ordered_pages = booklet_order(pages)

    # 2. A4 문서 만들기
    a4_doc = fitz.open()
    a4_width, a4_height = fitz.paper_size("a4")
    a4_width, a4_height = a4_height, a4_width  # 가로로 회전

    # 3. 한 페이지에 8-up (2행 4열)
    rows, cols = 2, 4
    w = a4_width / cols
    h = a4_height / rows

    for i in range(0, len(ordered_pages), rows * cols):
        page = a4_doc.new_page(width=a4_width, height=a4_height)
        for j in range(rows * cols):
            if i + j >= len(ordered_pages): break
            src_page = doc.load_page(ordered_pages[i+j])
            # pix = src_page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))  # 축소 비율 조정
            pix = src_page.get_pixmap(matrix=fitz.Matrix(1, 1))  # 축소 비율 조정
            x = (j % cols) * w
            y = (j // cols) * h
            page.insert_image(
                fitz.Rect(x, y, x + w, y + h),
                pixmap=pix
            )

    a4_doc.save("output_booklet.pdf")
    a4_doc.close()
    doc.close()


if __name__ == '__main__':
    run()




