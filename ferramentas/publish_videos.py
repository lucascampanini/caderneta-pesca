"""Copy finished knot videos to DOCS/nos with a poster (final frame) and the chapter timeline.
usage: publish_videos.py VIDEO_DIR DOCS"""
import sys, shutil, pathlib, json
import cv2

V, DOCS = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
OUT = DOCS / 'nos'; OUT.mkdir(parents=True, exist_ok=True)
for tl in sorted(V.glob('*.timeline.json')):
    n = json.loads(tl.read_text(encoding='utf-8'))['name']
    mp4 = V / f'{n}.mp4'
    cap = cv2.VideoCapture(str(mp4))
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if frames <= 0:
        print(n, 'not finished'); continue
    cap.set(cv2.CAP_PROP_POS_FRAMES, frames - 2)
    ok, im = cap.read()
    if not ok:
        print(n, 'unreadable'); continue
    cv2.imwrite(str(OUT / f'{n}.jpg'), im, [cv2.IMWRITE_JPEG_QUALITY, 84])
    shutil.copy(mp4, OUT / f'{n}.mp4'); shutil.copy(tl, OUT / tl.name)
    print(n, frames, 'frames', mp4.stat().st_size // 1024, 'KB')
