import {
    filledArray,
} from './utils';


export class Identity {
    constructor(identityStruct = null) {
        this.sigLength = 8;

        if (identityStruct) {
            if (identityStruct instanceof Identity || 'id' in identityStruct) {
                this.id = structuredClone(identityStruct.id);
            }
            else {
                this.id = structuredClone(identityStruct);
            }
        }
        else {
            this.id = genIdentity_Color();
        }

        this.initUpdates();
    }

    toColor(asArray = false) {
        let color = [];

        ['r', 'g', 'b'].forEach(cmp => {
            const val = parseInt(this.id[cmp].slice().reverse().join(''), 2);
            color.push(val);
        });

        if (asArray) {
            return color;
        }

        return `rgba(${color[0]}, ${color[1]}, ${color[2]}, 1.0)`;
    }

    update(otherIdentity, nearnessFactor) {
        return this.compareIdentity(otherIdentity, nearnessFactor);
    }

    resolve(targetID) {
        const color = this.toColor();

        // Iterate the slots one by one, 

        Array(this.sigLength).fill(0).forEach((_, i) => {
            Object.keys(this.updates).forEach(cmp => {
                const diffVal = this.updates[cmp].d[i],
                    simVal = this.updates[cmp].s[i];

                // Calculate chance of a bit-flip

                // But only if more different than similar
                if (diffVal <= simVal) {
                    return;
                }

                const flipChance = diffVal / (simVal + diffVal);
                const slotFactor = 1 / (2 ** (i + 1));
                const randVal = Math.random();
                const flip = randVal < (flipChance * slotFactor);

                if (flip) {
                    //if (i >= 6 && targetID == 102) debugger
                    const currVal = this.id[cmp][i];
                    this.id[cmp][i] = currVal === 0 ? 1 : 0;
                }
            });
        });

        this.initUpdates();
    }

    clone() {
        return new Identity(this);
    }

    initUpdates() {
        const sigLength = this.sigLength;
        this.updates = {
            'r': {
                's': Array(sigLength).fill(0),
                'd': Array(sigLength).fill(0),
            },
            'g': {
                's': Array(sigLength).fill(0),
                'd': Array(sigLength).fill(0),
            },
            'b': {
                's': Array(sigLength).fill(0),
                'd': Array(sigLength).fill(0),
            },
        }
    }

    compareIdentity(b, val = 1.0) {
        const a = this.id;
        const c = this.updates;

        ['r', 'g', 'b'].forEach(cmp => {
            for (let i = 0; i < this.sigLength; i++) {
                const aVal = a[cmp][i],
                    bVal = b.id[cmp][i];

                if (aVal === bVal) {
                    c[cmp].s[i] += val;
                }
                else {
                    c[cmp].d[i] += val;
                }
            }
        });

        return c;
    }
}


export function genIdentity_Color(color = null) {
    // Convert each 8-bit component to binary and plunk into an array with low bit first
    color = color || filledArray(3, 256);

    let i = color.map(cmp => {
      return cmp.toString(2).padStart(8, "0").split('').reverse().map(d => parseInt(d));
    });

    let result = {
        r: i[0],
        g: i[1],
        b: i[2],
    }

    if (color.length == 4) {
        result.a = i[3];
    }

    return result;
}
