import { Jimp } from 'jimp';

async function test() {
    try {
        const mainImage = await Jimp.read('public/watermark_cloth.png');
        const watermark = await Jimp.read('public/watermark_cloth.png');
        
        watermark.resize({ w: mainImage.bitmap.width });
        // composite without the 4th argument
        mainImage.composite(watermark, 0, 0);
        
        const bbuf = await mainImage.getBase64('image/jpeg');
        console.log("Success with composite:", typeof bbuf);
    } catch(err) {
        console.error('Fatal err:', err.message || err);
    }
}
test();
