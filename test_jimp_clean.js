import { Jimp } from 'jimp';

async function test() {
    try {
        const img = await Jimp.read('public/watermark_cloth.png');
        try {
            const b64 = await img.getBase64('image/jpeg');
            console.log('getBase64 result:', typeof b64 === 'string' ? "String (" + b64.length + " bytes)" : typeof b64);
        } catch(e) {
            console.log("Error explicitly caught:", e.message);
        }
        
    } catch(err) {
        console.error('Fatal error', err);
    }
}
test();
