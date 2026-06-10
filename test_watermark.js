import { Jimp } from 'jimp';
import fs from 'fs';

async function test() {
    try {
        const mainImage = await Jimp.read('public/watermark_cloth.png');
        const watermark = await Jimp.read('public/watermark_cloth.png');
        
        watermark.resize(mainImage.bitmap.width, Jimp.AUTO);
        mainImage.composite(watermark, 0, 0, {
            mode: Jimp.BLEND_SOURCE_OVER,
            opacitySource: 1.0
        });
        
        try {
            console.log('Trying getBuffer...');
            const pBuf = await mainImage.getBuffer('image/jpeg');
            console.log('Success via getBuffer:', pBuf.length);
        } catch (e) {
            console.log('getBuffer failed:', e.message);
            // older jimp style
            mainImage.getBuffer('image/jpeg', (err, buffer) => {
                if (err) console.log('Callback getBuffer failed:', err.message);
                else console.log('Callback getBuffer success:', buffer.length);
            });
        }

    } catch(err) {
        console.error('Fatal err:', err.message);
    }
}
test();
