import * as constants from './const.js'
import {
	assert,
	loadImageAsync,
	getTextFileAsync
} from './utils.js';

// Returns raw image data
const sliceCharacterAsync = async (image_context, x, y) => {
	let element_canvas = document.createElement('canvas');
	element_canvas.height = constants.FONT_CHARACTER_HEIGHT;
	element_canvas.width = constants.FONT_CHARACTER_WIDTH;
	let canvas_context = element_canvas.getContext('2d');

	let image_data = image_context.getImageData(x, y, constants.FONT_CHARACTER_WIDTH, constants.FONT_CHARACTER_HEIGHT);
	let data = image_data.data;

	// Make all white transparent and note the width
	let width = 0;
	for (let px = 0; px < constants.FONT_CHARACTER_WIDTH; px++) {
		for (let py = 0; py < constants.FONT_CHARACTER_HEIGHT; py++) {
			// 4 bytes per pixel, RGBA, we only care to change the A if everything is 255
			let base_idx = (py * 4 * constants.FONT_CHARACTER_WIDTH) + (px * 4);
			let red = data[base_idx + 0];
			let green = data[base_idx + 1];
			let blue = data[base_idx + 2];
			let alpha = data[base_idx + 3];
			assert(((red == 0xff && green == 0xff && blue == 0xff) || (red == 0x00 && green == 0x00 && blue == 0x00)) && alpha == 0xff, "Image must be 1bpp black and white with no transparency");

			// If white, make it transparent instead
			// If not white, it must be black, so note the width
			if (red == 0xff && blue == 0xff && green == 0xff) {
				data[base_idx + 3] = 0;
			} else {
				width = px + 1;
			}
		}
	}

	canvas_context.putImageData(image_data, 0, 0);

	return [width, await loadImageAsync(element_canvas.toDataURL())];
};

// Take font with 8x8 tiles and return an array of image data for each character
export const load1bppFontAsync = async (filename) => {
	let font_image = await loadImageAsync(filename);
	const tile_count_x = font_image.width / constants.FONT_CHARACTER_WIDTH | 0;
	const tile_count_y = font_image.height / constants.FONT_CHARACTER_HEIGHT | 0;
	const tile_count = tile_count_y * tile_count_x;
	const tiles = new Array(tile_count);

	let element_canvas = document.createElement('canvas');
	let canvas_context = element_canvas.getContext('2d');
	element_canvas.height = font_image.height;
	element_canvas.width = font_image.width;
	canvas_context.drawImage(font_image, 0, 0);

	for (let py = 0; py < font_image.height; py += constants.FONT_CHARACTER_HEIGHT) {
		for (let px = 0; px < font_image.width; px += constants.FONT_CHARACTER_WIDTH) {
			const idx = (tile_count_x * (py / constants.FONT_CHARACTER_HEIGHT | 0)) + (px / constants.FONT_CHARACTER_WIDTH | 0);
			tiles[idx] = await sliceCharacterAsync(canvas_context, px, py);
		}
	}

	return tiles;
};