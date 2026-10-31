#!/usr/bin/env python3
"""Onmaum Heart 후원인 카드 생성기.
사용법:  python make_heart_card.py "Gildong Hong" 21
결과:    ../heart-21.jpg  (1065x612, 기존 카드와 같은 디자인)
필요:    pip install pillow
"""
import sys, os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, 'base.png')        # 이름·번호를 지운 빈 카드 (하트, 슬로건, 주소 포함)
SERIF = os.path.join(HERE, 'fonts', 'BodoniModa.ttf')
SANS = os.path.join(HERE, 'fonts', 'Montserrat.ttf')
TEAL = (36, 169, 154)
BLACK = (13, 13, 13)
ORANGE = (214, 104, 80)   # 번호 색 (Heart 5번 이후 카드와 동일)
X = 581                   # 텍스트 왼쪽 시작점
MAX_W = 1065 - X - 40

def font(path, size, weight, opsz=None):
    f = ImageFont.truetype(path, size)
    try:
        axes = [weight] if opsz is None else [weight, opsz]
        f.set_variation_by_axes(axes)
    except Exception:
        pass
    return f

def make(name, num, out=None):
    im = Image.open(BASE).convert('RGB')
    d = ImageDraw.Draw(im)
    size = 74
    while True:
        fn = font(SERIF, size, 600, 11)
        if d.textlength(name, font=fn) <= MAX_W or size <= 40:
            break
        size -= 2
    # 이름: 대문자 윗선 y≈92, 기준선 y≈151 에 맞춤
    d.text((X - 2, 151), name, font=fn, fill=TEAL, anchor='ls')
    fs = font(SANS, 27, 500)
    label = 'Onmaum Heart '
    d.text((X, 201), label, font=fs, fill=BLACK, anchor='ls')
    d.text((X + d.textlength(label, font=fs), 201), str(num), font=fs, fill=ORANGE, anchor='ls')
    out = out or os.path.join(HERE, '..', f'heart-{int(num):02d}.jpg')
    im.save(out, quality=88, optimize=True, progressive=True)
    return out

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print('사용법: python make_heart_card.py "영문 이름" 번호 [출력파일]'); sys.exit(1)
    print(make(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None))
