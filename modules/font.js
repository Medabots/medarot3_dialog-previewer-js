import { loadImageAsync } from './utils.js';

const FONT_CHARACTER_WIDTH = 8;
const FONT_CHARACTER_HEIGHT = 8;

async function sliceCharacter(image_context, x, y)
{
	return new Promise(resolve =>
	{
		var element_canvas = document.createElement('canvas');
		element_canvas.height = FONT_CHARACTER_HEIGHT;
		element_canvas.width = FONT_CHARACTER_WIDTH;
		var canvas_context = element_canvas.getContext('2d');

		canvas_context.putImageData(image_context.getImageData(x, y, FONT_CHARACTER_WIDTH, FONT_CHARACTER_HEIGHT), 0, 0);
		var img = new Image()
		img.src = element_canvas.toDataURL();
		resolve(img);
		// TODO: Make 'white' transparent
		// TODO: Return (raw image data, character width)
	});
}

// Take font with 8x8 tiles and return an array of image data for each character
async function loadFontAsync(filename)
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

	return tiles;
}

export { loadFontAsync }