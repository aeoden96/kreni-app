#!/usr/bin/env python3
"""Regenerate the Android themed (Material You) monochrome icon.

The Kreni icon is a dark tile with a bright map-pin mark. This extracts that mark
from the adaptive-icon foreground by luminance threshold, paints it white, keeps
the original alpha for smooth edges, and writes the <monochrome> drawable.

Pure stdlib — no Pillow/ImageMagick needed. Run from the repo root:
    python3 scripts/gen-android-monochrome-icon.py

NOTE: `yarn cap:assets` regenerates the adaptive-icon XMLs and drops the
<monochrome> layer. After any icon regen, re-add to both
android/app/src/main/res/mipmap-anydpi-v26/ic_launcher{,_round}.xml:
    <monochrome>
        <inset android:drawable="@drawable/ic_launcher_monochrome" android:inset="16.7%" />
    </monochrome>
and re-run this script.
"""

import struct
import zlib

SRC = 'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png'
DST = 'android/app/src/main/res/drawable/ic_launcher_monochrome.png'
THRESH = 150  # luminance cutoff between the dark body and the bright mark


def _paeth(a, b, c):
    p = a + b - c
    pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
    return a if pa <= pb and pa <= pc else (b if pb <= pc else c)


def read_rgba(path):
    d = open(path, 'rb').read()
    assert d[:8] == b'\x89PNG\r\n\x1a\n', 'not a PNG'
    i, w, h, idat = 8, 0, 0, b''
    while i < len(d):
        ln = struct.unpack('>I', d[i:i + 4])[0]
        typ, data = d[i + 4:i + 8], d[i + 8:i + 8 + ln]
        if typ == b'IHDR':
            w, h = struct.unpack('>II', data[:8])
            assert data[8] == 8 and data[9] == 6, 'expected 8-bit RGBA'
        elif typ == b'IDAT':
            idat += data
        elif typ == b'IEND':
            break
        i += 12 + ln
    raw = zlib.decompress(idat)
    bpp, stride = 4, w * 4
    prev, out, pos = bytearray(stride), bytearray(), 0
    for _ in range(h):
        ft = raw[pos]; pos += 1
        line = bytearray(raw[pos:pos + stride]); pos += stride
        for x in range(stride):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if ft == 1: line[x] = (line[x] + a) & 255
            elif ft == 2: line[x] = (line[x] + b) & 255
            elif ft == 3: line[x] = (line[x] + ((a + b) >> 1)) & 255
            elif ft == 4: line[x] = (line[x] + _paeth(a, b, c)) & 255
        out += line; prev = line
    return w, h, out


def write_rgba(path, w, h, px):
    stride = w * 4
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw += px[y * stride:(y + 1) * stride]

    def chunk(typ, data):
        return (struct.pack('>I', len(data)) + typ + data
                + struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff))

    ihdr = struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0)
    open(path, 'wb').write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr)
                           + chunk(b'IDAT', zlib.compress(bytes(raw), 9))
                           + chunk(b'IEND', b''))


def main():
    w, h, src = read_rgba(SRC)
    dst = bytearray(len(src))
    kept = 0
    for i in range(0, len(src), 4):
        r, g, b, a = src[i], src[i + 1], src[i + 2], src[i + 3]
        lum = (r * 299 + g * 587 + b * 114) // 1000
        if a > 40 and lum >= THRESH:
            dst[i] = dst[i + 1] = dst[i + 2] = 255
            dst[i + 3] = a
            kept += 1
    write_rgba(DST, w, h, dst)
    print(f'wrote {DST} ({w}x{h}), mark coverage {kept / (w * h):.1%}')


if __name__ == '__main__':
    main()
