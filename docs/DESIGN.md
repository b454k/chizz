# chizz — Design

How the game looks and why. The rules of the game are in [SPEC.md](SPEC.md); nothing here
changes them. Every screen, flow, timer and word is exactly what it was — this is the
surface.

<p align="center">
  <img src="chizz-look.jpg" alt="Five screens of the redesign: the start screen, a drawing, the word pool, a marked result and the score board in the dark theme" width="760">
</p>

---

## The idea: a sketchbook on a desk

chizz is a game about drawing badly and fast, then trying to read your own scribbles. The
old look was a generic dark app — grey panels, one orange accent — and said nothing about
that. The new one borrows everything from the objects the game is really about:

| Object | Becomes |
|---|---|
| A dot-grid sketchbook page | The background of every screen |
| Graphite | All text and every outline |
| A yellow pencil | The one colour that means *press this* |
| A teacher's red pen | The circle round a score, and the cross on a wrong answer |
| A tick in green | A right answer |
| A tear-off wall calendar (*takvim yaprağı*) | The day's puzzle on the start screen |
| A rubber stamp | The mark on that leaf once the day is played |
| A punched paper ticket | The code a round is shared by |
| An eraser | `ekranı temizle` |

The drawing paper itself stays white paper in both themes, because the pen is graphite in
both. The dark theme is not a negative of the light one; it is the same desk with the lamp
on.

## Principles, and the habits of people they answer to

**One yellow thing per screen.** An element that differs from everything around it is the
one that gets noticed and remembered (the *isolation effect*). So yellow is rationed: every
screen has at most one filled yellow button, and it is always the step the player most
likely wants. The old start screen had two competing primaries — an orange `çiz` and a
full-width white `başla`, the heaviest thing on the page. Now `başla` is outlined until the
day's puzzle has been played, and then the yellow moves to it: the hierarchy follows what is
left to do, using `:has()` and no script.

**Three weights of button, no more.** Yellow and lifted for the main step, outlined and
lifted for the other ways on, plain text for the ways out (`ana ekran` on the question
screens). Fewer equal-looking choices make a decision faster (*Hick's law*); the weight
says which choice is expected before a word is read.

**Things you press look pressable, and go down when pressed.** Buttons, cards and tiles sit
on a hard, unblurred shadow and drop onto it under a finger, like keys. The response is
immediate, well inside the time in which a tap feels connected to its result.

**Targets sized for thumbs.** Primary buttons are 58px tall, secondary 54, nothing tappable
is under 44. The small pills along the top have an invisible 46px landing area around a
38px shape (*Fitts's law*).

**Show progress, and reward finishing.** The recall screen has a bar beside `12 / 20`, and
`bitir` stays outlined — pressable, a blank still counts as wrong — until every drawing has
an answer, when it turns yellow. People speed up as a goal comes into sight (*goal
gradient*), and the colour change is the finish line.

**Make the end worth remembering.** People judge an experience by its peak and its end.
The result opens with the score circled in red pen, the circle drawing itself.

**Keep things that belong together, together.** `paylaş` and `cevaplarımı kaydet` are the
two ways to take a round away, so they sit side by side directly under the drawings they
are about, in their own colours: the eye reads things that are close as one group (*law of
proximity*). Before, one was under the grid and the other below the board.

**Show time as a feeling, not a number.** While drawing, the time left is the gauge and
nothing else. The seconds each word gets used to sit in the header too, one more thing to
read beside the word in the second there is to read it; the setting is chosen before the
round, and during it the gauge says all that is needed.

**A bad round should still be funny.** The old result framed every wrong drawing in red; a
round of 3/20 was a wall of red, which reads as being told off in a game meant to be laughed
at. Now a right answer is framed green and a wrong one keeps its plain frame with a small red
cross. The information is identical; the tone is not.

**Never rely on colour alone.** Right and wrong carry a tick or a cross as well as green or
red, so the marking survives colour blindness and grey-scale screenshots. While guessing, an
answered drawing says so three ways at once -- a pencil badge in its corner, its word on a
solid yellow label, and its frame -- because a frame alone disappears in the dark theme.

**Anchor the recommendation.** The speed slider is a fat pill that fills with yellow up to
the chosen second, and `önerilen: 3 sn` is pinned under the 3 as a place on the track rather
than a sentence below it. A visible default is the strongest nudge there is.

**Keep the safe choice first.** `oyundan çıkılsın mı?` leads with `oyuna dön` in yellow and
puts `çık` in red text below it; `bitirdin mi?` leads with `tahmine devam et`. Losing a round
by accident hurts more than a second tap costs.

**Label every icon.** Icons help recognition, but only beside words; the only icon-only
buttons are the back arrows and the close cross, and both carry an `aria-label`.

## Tokens

All colours are CSS custom properties on `:root`. Light is the base; dark restates only
what differs, once for `koyu` and once for `otomatik` on a device asking for dark.

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#F4EFE6` | `#151517` | the page |
| `--dot` | `rgba(74,60,38,.17)` | `rgba(255,246,228,.075)` | the dot grid, 22px |
| `--panel` | `#FFFCF5` | `#1F1F23` | cards and sheets |
| `--panel2` | `#EFE8DA` | `#29292F` | inset areas, the selected segment |
| `--ink` | `#1D1B18` | `#F5F0E6` | text, strong outlines |
| `--muted` | `#6B6459` | `#A7A197` | secondary text |
| `--edge` | `#1D1B18` | `#3F3F47` | the outline round a card or button |
| `--shadow` | `#1D1B18` | `#08080A` | the hard shadow under it |
| `--hi` | `#FFC53D` | `#FFC940` | pencil yellow: the one thing to press |
| `--done` | `#1D1B18` | `#FFC940` | the frame round a drawing that has an answer |
| `--ok` | `#1C7D45` | `#5FD394` | right answers, success notes |
| `--no` | `#C8322A` | `#FF7A6B` | wrong answers, errors, the red pen |
| `--paper` | `#FFFFFF` | `#EFE9DD` | the drawing surface |
| `--pen` | `#17181c` | `#17181c` | the drawing itself, unchanged |

Every text pairing meets WCAG AA. The tightest are `--ok` on the page (4.51:1) and `--no`
on the page (4.65:1); body text is 15:1 in light and 16:1 in dark, graphite on yellow 10.9:1.

**Type.** No font is loaded — the page loads nothing from outside. Headings, buttons and
numbers use `ui-rounded` (SF Pro Rounded on Apple devices) at weights 800–900, falling back
to the system face; body text uses the plain system face. Codes use the system monospace.
All interface text stays lowercase, as it always has.

**Shape.** Radii of 14 (small), 16–18 (buttons, fields), 20–24 (cards), 28 (sheets and
dialogs). Outlines are 2–2.5px. Shadows are offset straight down, 2–8px, never blurred.

**Motion.** Short and purposeful: buttons press in 90ms; dialogs rise with a slight spring
in 280ms; sheets slide in 220ms and slide back out rather than vanishing. Things that are
drawn *draw themselves* — the wordmark on the first visit, the red circle round a score, the
tick after a round, every stroke of the how-to loop. With `prefers-reduced-motion`, the
decoration goes and what carries meaning stays: the timer gauge, the countdown, fades.

## The pieces

**Wordmark.** Five pencil strokes and a dot, drawn as SVG paths in the page — no font, so
it is the same on every device. The dot over the `i` is pencil yellow, and a yellow pass
underlines the word. The saved picture draws the wordmark from the same paths, so there is
only one copy of it.

**Icon.** The old orange `c` becomes graphite on pencil yellow, and a pencil is just
finishing it. From 120px up the pencil is drawn in outline, with its stripes; at 16–48px it
is solid, because fine lines turn to noise in a browser tab. Everything is written by
`tools/make-icons.js` as geometry: `favicon.ico`, `apple-touch-icon.png`, `icon-512.png`,
`icon.svg`, and `og.png`, the card a pasted `chizz.party` shows — the wordmark and four
drawings from a real round that are hard to tell apart.

**Interface icons.** 28 line drawings on a 24-unit grid in the wordmark's rounded 2.2
stroke, stored as CSS masks so they take the colour of the text beside them. They are
pseudo-elements because the game writes button labels with `textContent`, which would wipe
out a child element.

**Illustrations.** Small inline SVG drawings in the same stroke, one per moment that needed
a face: a fanned stack of pages with a yellow tick that draws itself (twenty drawings
done), a paper plane on a
looping pencil trail (send), a closed eye with a pencil beside it (`önce sen çiz` — no
peeking, draw first), a scribble drawing itself (loading), a pencil snapped in two (a code
that is gone).

**nasıl oynanır.** The 430KB recorded GIF is replaced by a nine-second loop drawn in the
page with CSS and SVG, and every drawing in it is a real one, from round 6G75: `buzdolabı`
drawing itself against the clock, stroke by stroke in the order it was drawn; `saat`, whose
drawer wrote a 1 and a 2 into the clock, struck through for *rakam yazmak yok*; then the
round's four tall boxes -- `kapı`, `buzdolabı`, `telefon`, `valiz` -- with the word dropped
onto the right one. It is sharp at any size, follows the theme, costs about 5KB, and starts
from the first scene whenever it opens, because it only runs while visible.

## Screen by screen

**Start.** Wordmark, then the day's puzzle as a card: a calendar leaf (weekday, date,
month, in Turkey's time) beside `günlük oyun` and `3 sn`, with `çiz` in yellow and the
day's board as a text link. Played, the leaf gets a green stamp, the line turns to `✓
bugünü oynadın 14/20` and the yellow moves to `başla` below. sınırsız is its own card: the
speed pill, `başla`, and under a dashed line the code field, set in monospace like a ticket
number. The theme is a three-way switch at the foot — açık, koyu, otomatik — defaulting to
the device. On a wide screen the empty margins get a few faint pencil doodles.

**Countdown.** The number alone, large, popping in on each second.

**Drawing.** The paper is lifted on a hard shadow in the middle of the space, where a thumb
reaches it one-handed. The word and the `7 / 20` pill sit in a header of one fixed height,
with no seconds in it; a long word — `tekerlekli sandalye` — is set smaller until it fits instead of
being cut with an ellipsis, and the fixed height means the paper never moves under a pen
already on its way. The time left is a gauge in a pencil outline; the eraser pill between the
gauge and the paper clears the page.

**Between.** A stack of pages with a yellow tick drawing itself on the top one, `arkadaşına
gönder` in yellow with a paper plane,
`kendim tahmin edeyim` outlined.

**kolay or zor.** Two cards side by side with their own colour and picture — green word tags
for kolay, a red keyboard for zor — so the difference is seen before it is read.

**Guessing.** Drawings on paper tiles; the selected one lifts in a yellow ring; an answered
one gets a pencil badge, its word on a yellow label underneath, and a frame that is graphite
by day and yellow at night. The word pool is a bottom sheet with
the drawing large and the words as tactile tiles; the typed answer is a card rising above
the keyboard. The round's code is an outlined chip in the corner.

**Result.** The score circled in red pen, then the marked grid, and under it `paylaş` and
`cevaplarımı kaydet` side by side; then the name, the round's code set large, and the board: a card with a yellow heading strip, medal badges for the
first three, a chevron on every row that opens a friend's answers, your own row highlighted,
and a pulsing dot beside `arkadaşların bitirdikçe burada beliriyor` — it is live, and now
it looks live.

**Send.** The code as a paper ticket punched either side, the link below it in monospace,
`linki kopyala` in yellow.

**Dialogs.** A tilted icon sticker, the question, the safe answer first.

**The saved picture.** Drawn on the same dot-grid page, with the wordmark, the score circled
in red, tiles lifted on hard shadows and the right ones framed green, in whichever theme is
showing.

## Fixed along the way

Found while redesigning, and fixed because they were visual:

- A long word in the drawing header was cut off with an ellipsis while it was being drawn.
- On the question screens a paragraph rule outranked the name field's own label, hint and
  error, so `önce adını yaz.` showed in grey instead of red.
- In the light theme the zoom caption was dark text on the dark backdrop.
- The time question's sentence jumped between one line and two as the slider crossed a half
  second (`2,5` is wider than `3`); it is now sized once for its widest value and keeps
  to one line.
- The yellow of the speed pill showed past the thumb's rounded right side.
- On a short window the paper was sized from room that counted the stage's padding, so it
  grew into the eraser above it.
- The how-to GIF was the heaviest thing a first visit downloaded; the page is now lighter on
  a first visit by about 370KB, although the page file itself grew by about 59KB of styles
  and drawings.
