# Onmaum Heart 후원인 카드 추가 방법

## 1. 카드 이미지 만들기
```
pip install pillow
cd 후원인명단/template
python make_heart_card.py "Gildong Hong" 21
```
- 영문 이름과 Heart 번호를 넣으면 `후원인명단/heart-21.jpg` 가 만들어집니다.
- 기존 카드와 같은 디자인입니다 (1065×612, 분홍 하트, 청록 이름, 슬로건, www.goodmind.or.kr).
- 이름이 길면 글자 크기가 자동으로 줄어듭니다.
- 직접 디자인한 카드가 있으면 이 단계 없이 같은 크기로 `heart-21.jpg` 이름으로 넣어도 됩니다.

## 2. 홈페이지 목록에 한 줄 추가
`index.html` 에서 `ONMAUM_HEARTS` 를 찾아 마지막에 한 줄을 추가합니다.
```
      [20, 'Daon Hwang'],
      [21, 'Gildong Hong']
```
(앞 줄 끝에 쉼표 `,` 를 잊지 마세요. 번호 순으로 자동 정렬됩니다.)

## 3. 올리기
GitHub main 브랜치에 커밋·푸시하면 Vercel 에 자동 반영됩니다.

## 폴더 안 파일
- `make_heart_card.py` : 카드 생성 스크립트
- `base.png` : 이름·번호만 비운 기본 카드 (하트·슬로건 포함, Heart 1 카드에서 잘라 만든 것)
- `fonts/` : Bodoni Moda(이름), Montserrat(번호) — 모두 SIL Open Font License 무료 글꼴
