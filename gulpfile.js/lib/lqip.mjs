// Based on https://leanrada.com/notes/css-only-lqip/
// Code was simplified to focus only on this feature
/*
BSD 2-Clause License

Copyright (c) [2023], [Beeno Tung (Tung Cheung Leong)]
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

---

MIT License

Copyright (c) 2019 Christopher Michael Buck

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

The MIT License (MIT)

Copyright (c) 2015 Lokesh Dhakar

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import quantize from "@lokesh.dhakar/quantize";
import { getPixels } from "ndarray-pixels";
import sharp from "sharp";

function createPixelArray(pixels, pixelCount, quality) {
  const pixelArray = [];

  for (let i = 0, offset, r, g, b; i < pixelCount; i += quality) {
    offset = i * 4;
    r = pixels[offset];
    g = pixels[offset + 1];
    b = pixels[offset + 2];

    pixelArray.push([r, g, b]);
  }

  return pixelArray;
}

function validateOptions(options) {
  let { colorCount, quality } = options;

  if (typeof colorCount === "undefined" || !Number.isInteger(colorCount)) {
    colorCount = 10;
  } else if (colorCount === 1) {
    throw new Error(
      "`colorCount` should be between 2 and 20. To get one color, call `getColor()` instead of `getPalette()`"
    );
  } else {
    colorCount = Math.max(colorCount, 2);
    colorCount = Math.min(colorCount, 20);
  }

  if (
    typeof quality === "undefined" ||
    !Number.isInteger(quality) ||
    quality < 1
  ) {
    quality = 10;
  }

  return { colorCount, quality };
}

function loadImg(img) {
  return new Promise((resolve, reject) => {
    sharp(img)
      .toBuffer()
      .then((buffer) =>
        sharp(buffer)
          .metadata()
          .then((metadata) => ({ buffer, format: metadata.format }))
      )
      .then(({ buffer, format }) => getPixels(buffer, format))
      .then(resolve)
      .catch(reject);
  });
}

function getPalette(img, colorCount = 10, quality = 10) {
  const options = validateOptions({ colorCount, quality });

  return loadImg(img).then((imgData) => {
    const pixelCount = imgData.shape[0] * imgData.shape[1];
    const pixelArray = createPixelArray(
      imgData.data,
      pixelCount,
      options.quality
    );

    const cmap = quantize(pixelArray, options.colorCount);
    return cmap?.palette() ?? null;
  });
}
/** @typedef {import("@types/nunjucks").Environment} Environment */

function rgbToOkLab(rgb) {
  const r = gamma_inv(rgb.r / 255);
  const g = gamma_inv(rgb.g / 255);
  const b = gamma_inv(rgb.b / 255);

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  return {
    L: l * +0.2104542553 + m * +0.793617785 + s * -0.0040720468,
    a: l * +1.9779984951 + m * -2.428592205 + s * +0.4505937099,
    b: l * +0.0259040371 + m * +0.7827717662 + s * -0.808675766
  };
}

function gamma_inv(x) {
  return x >= 0.04045 ? ((x + 0.055) / 1.055) ** 2.4 : x / 12.92;
}

async function analyzeImage(image) {
  const theSharp = sharp(image);
  const stats = await theSharp.stats();
  const opaque = stats.isOpaque;

  if (!opaque) {
    return {
      opaque: false
    };
  }

  const [previewBuffer, dominantColor] = await Promise.all([
    theSharp
      .resize(3, 2, { fit: "fill" })
      .sharpen({ sigma: 1 })
      .removeAlpha()
      .toFormat("raw", { bitdepth: 8 })
      .toBuffer(),
    getPalette(image, 4, 10).then((palette) => palette[0])
  ]);

  const {
    L: rawBaseL,
    a: rawBaseA,
    b: rawBaseB
  } = rgbToOkLab({
    r: dominantColor[0],
    g: dominantColor[1],
    b: dominantColor[2]
  });
  const { ll, aaa, bbb } = findOklabBits(rawBaseL, rawBaseA, rawBaseB);
  const { L: baseL } = bitsToLab(ll, aaa, bbb);

  const cells = Array.from({ length: 6 }, (_, index) => {
    const r = previewBuffer.readUint8(index * 3);
    const g = previewBuffer.readUint8(index * 3 + 1);
    const b = previewBuffer.readUint8(index * 3 + 2);
    return rgbToOkLab({ r, g, b });
  });

  const values = cells.map(({ L }) => clamp(0.5 + L - baseL, 0, 1));

  return { opaque: true, ll, aaa, bbb, values };
}

// find the best bit configuration that would produce a color closest to target
function findOklabBits(targetL, targetA, targetB) {
  const targetChroma = Math.hypot(targetA, targetB);
  const scaledTargetA = scaleComponentForDiff(targetA, targetChroma);
  const scaledTargetB = scaleComponentForDiff(targetB, targetChroma);

  let bestBits = [0, 0, 0];
  let bestDifference = Infinity;

  for (let lli = 0; lli <= 0b11; lli++) {
    for (let aaai = 0; aaai <= 0b111; aaai++) {
      for (let bbbi = 0; bbbi <= 0b111; bbbi++) {
        const { L, a, b } = bitsToLab(lli, aaai, bbbi);
        const chroma = Math.hypot(a, b);
        const scaledA = scaleComponentForDiff(a, chroma);
        const scaledB = scaleComponentForDiff(b, chroma);

        const difference = Math.hypot(
          L - targetL,
          scaledA - scaledTargetA,
          scaledB - scaledTargetB
        );

        if (difference < bestDifference) {
          bestDifference = difference;
          bestBits = [lli, aaai, bbbi];
        }
      }
    }
  }

  return { ll: bestBits[0], aaa: bestBits[1], bbb: bestBits[2] };
}

// Scales a or b of Oklab to move away from the center
// so that euclidean comparison won't be biased to the center
function scaleComponentForDiff(x, chroma) {
  return x / (1e-6 + chroma ** 0.5);
}

function bitsToLab(ll, aaa, bbb) {
  const L = (ll / 0b11) * 0.6 + 0.2;
  const a = (aaa / 0b1000) * 0.7 - 0.35;
  const b = ((bbb + 1) / 0b1000) * 0.7 - 0.35;
  return { L, a, b };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export async function lqip(image) {
  const { ll, aaa, bbb, values, opaque } = await analyzeImage(image);
  if (!opaque) return null;
  const ca = Math.round(values[0] * 0b11);
  const cb = Math.round(values[1] * 0b11);
  const cc = Math.round(values[2] * 0b11);
  const cd = Math.round(values[3] * 0b11);
  const ce = Math.round(values[4] * 0b11);
  const cf = Math.round(values[5] * 0b11);
  return (
    -(2 ** 19) +
    ((ca & 0b11) << 18) +
    ((cb & 0b11) << 16) +
    ((cc & 0b11) << 14) +
    ((cd & 0b11) << 12) +
    ((ce & 0b11) << 10) +
    ((cf & 0b11) << 8) +
    ((ll & 0b11) << 6) +
    ((aaa & 0b111) << 3) +
    (bbb & 0b111)
  );
}
