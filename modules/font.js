import { assert, loadImageAsync, getTextFileAsync} from './utils.js';

const FONT_CHARACTER_WIDTH = 8;
const FONT_CHARACTER_HEIGHT = 8;

const sliceCharacter = (image_context, x, y) =>
(
	new Promise(async resolve =>
	{
		var element_canvas = document.createElement('canvas');
		element_canvas.height = FONT_CHARACTER_HEIGHT;
		element_canvas.width = FONT_CHARACTER_WIDTH;
		var canvas_context = element_canvas.getContext('2d');
		
		var image_data = image_context.getImageData(x, y, FONT_CHARACTER_WIDTH, FONT_CHARACTER_HEIGHT);
		var data = image_data.data;

		// Make all white transparent and note the width
		var width = 0;
		for(var px = 0; px < FONT_CHARACTER_WIDTH; px++)
		{
			for(var py = 0; py < FONT_CHARACTER_HEIGHT; py++)
			{
				// 4 bytes per pixel, RGBA, we only care to change the A if everything is 255
				var base_idx = (py * 4 * FONT_CHARACTER_WIDTH) + (px * 4);
				var red = data[base_idx + 0];
				var green = data[base_idx + 1];
				var blue = data[base_idx + 2];
				var alpha = data[base_idx+ 3];
				assert( ((red == 0xff && green == 0xff && blue == 0xff) || (red == 0x00 && green == 0x00 && blue == 0x00)) && alpha == 0xff, "Image must be 1bpp black and white with no transparency");

				// If white, make it transparent instead
				// If not white, it must be black, so note the width
				if(red == 0xff && blue == 0xff && green == 0xff)
				{
					data[base_idx + 3] = 0;
				}
				else
				{
					width = py + 1;
				}
			}
		}

		canvas_context.putImageData(image_data, 0, 0);

		resolve([width, await loadImageAsync(element_canvas.toDataURL())]);
	})
);

// Take font with 8x8 tiles and return an array of image data for each character
const load1bppFontAsync = (filename) =>
(
	new Promise(async resolve =>
	{
		var font_image = await loadImageAsync(filename);
		const tile_count_x = font_image.width / FONT_CHARACTER_WIDTH | 0;
		const tile_count_y = font_image.height / FONT_CHARACTER_HEIGHT | 0;
		const tile_count = tile_count_y * tile_count_x;
		const tiles = new Array(tile_count);

		var element_canvas = document.createElement('canvas');
		var canvas_context = element_canvas.getContext('2d');
		element_canvas.height = font_image.height;
		element_canvas.width = font_image.width;
		canvas_context.drawImage(font_image, 0, 0);

		for(var py = 0; py < font_image.height; py += FONT_CHARACTER_HEIGHT)
		{
			for(var px = 0; px < font_image.width; px += FONT_CHARACTER_WIDTH)
			{
				const idx = (tile_count_x * (py/FONT_CHARACTER_HEIGHT | 0)) + (px/FONT_CHARACTER_WIDTH | 0);
				tiles[idx] = await sliceCharacter(canvas_context, px, py);
			}
		}

		resolve(tiles);
	})
);

const loadFontTable = (filename) =>
(
	getTextFileAsync(filename);
);

export { load1bppFontAsync, loadFontTable }