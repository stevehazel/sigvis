import { get, set, del } from 'idb-keyval';

export async function JSONFromIDB(key) {
    return await get(key);
}


export function ToJSONIDB(key, val) {
    set(key, val);
}


export function delIDB(key) {
    del(key);
}


export function JSONFromStorage(key) {
    let j = localStorage.getItem(key)
    if (j) {
      return JSON.parse(j)
    }
}


export function ToJSONStorage(key, val) {
    localStorage.setItem(key, JSON.stringify(val))
}


export function calculateTotalAreaRadius(radii, level) {
    const totalArea = radii.reduce((sum, radius) => {
        return sum + Math.PI * radius * radius;
    }, 0);
    
    return Math.sqrt(totalArea / Math.PI);
}


export function choiceFrom(arr) {
    return arr[parseInt(Math.floor(Math.random() * arr.length))]
}


export function filledArray(arrayLength, valueMax) {
    return Array(arrayLength).fill().map(() => parseInt(Math.floor(Math.random() * valueMax)))
}


export function calcArea(boundingBox = null) {
    if (!boundingBox) {
        boundingBox = {
            x: [0, window.innerWidth],
            y: [0, window.innerHeight],
        }
    }
    return parseInt((boundingBox.x[0] - boundingBox.x[1]) * (boundingBox.y[0] - boundingBox.y[1]));
}


export function blendColors(colorList, asArray = false) {
    if (!colorList || colorList.length === 0) {
        return 'rgba(0, 0, 0, 1)';
    }

    if (colorList.some((v) => !v)) {
        debugger
    }

    const parseRGBA = (color) => {
        const matches = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
        if (!matches) return null;
        return {
            r: parseInt(matches[1]),
            g: parseInt(matches[2]),
            b: parseInt(matches[3]),
            a: matches[4] !== undefined ? parseFloat(matches[4]) : 1
        };
    };

    const components = colorList
        .map(parseRGBA)
        .filter(comp => comp !== null);

    if (components.length === 0) {
        return 'rgba(0, 0, 0, 1)';
    }

    // Accumulate weighted values
    let totalR = 0, totalG = 0, totalB = 0, totalA = 0;
    let weightSum = 0;

    components.forEach(comp => {
        // Use alpha as weight factor for more perceptual accuracy
        const weight = comp.a;
        totalR += comp.r * weight;
        totalG += comp.g * weight;
        totalB += comp.b * weight;
        totalA += comp.a;
        weightSum += weight;
    });

    // Calculate averages
    const count = components.length;
    const avgR = Math.round(totalR / weightSum);
    const avgG = Math.round(totalG / weightSum);
    const avgB = Math.round(totalB / weightSum);
    const avgA = totalA / count; // Simple average for alpha

    // Clamp values to valid ranges
    const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
    const finalR = clamp(avgR, 0, 255);
    const finalG = clamp(avgG, 0, 255);
    const finalB = clamp(avgB, 0, 255);
    const finalA = clamp(avgA, 0, 1);

    if (asArray) {
        return [finalR, finalG, finalB, finalA];
    }

    return `rgba(${finalR}, ${finalG}, ${finalB}, ${finalA})`;
}


export function createCanvasThumbnail(sourceCtx, thumbnailWidth = 150) {
    const sourceCanvas = sourceCtx.canvas

    // Create a new canvas for the thumbnail
    const thumbnailCanvas = document.createElement('canvas');

    // Calculate proportional height based on source canvas aspect ratio
    const thumbnailHeight = (sourceCanvas.height * thumbnailWidth) / sourceCanvas.width;

    thumbnailCanvas.width = thumbnailWidth;
    thumbnailCanvas.height = thumbnailHeight;

    const thumbnailCtx = thumbnailCanvas.getContext('2d');
    thumbnailCtx.drawImage(sourceCanvas, 0, 0, thumbnailWidth, thumbnailHeight);

    return thumbnailCanvas.toDataURL('image/png');
}
