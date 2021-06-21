// Medarot 3 specific implementation details

import * as constants from './const.js'
import { assert, loadImageAsync, drawImageAndResizeVertical } from './utils.js';
import { load1bppFontAsync, loadFontTableAsync } from './font.js'


// Input: Format String
// Output: Generator that yields each text box's array of dependencies to use in the drawBox functions
// Will take input text and determine what to do with it
export function* getDependencies(dialog_string)
{
	// Preload and preprocess images
	const next_page_images = [
		loadImageAsync("resources/window/next-page.png"),
		loadImageAsync("resources/window/error-top-next-page.png"),
		loadImageAsync("resources/window/error-bottom-next-page.png"),
		loadImageAsync("resources/window/error-both-next-page.png"),
	];
	const last_page_images = [
		loadImageAsync("resources/window/last-page.png"),
		loadImageAsync("resources/window/error-top-last-page.png"),
		loadImageAsync("resources/window/error-bottom-last-page.png"),
		loadImageAsync("resources/window/error-both-last-page.png"),
	];

	const font_default = load1bppFontAsync("resources/fonts/Font.png");
	//const font_narrow = load1bppFontAsync("resources/fonts/NarrowFont.png"); // Shouldn't be necessary for dialog
	const font_default_bold = load1bppFontAsync("resources/fonts/BoldFont.png");
	const font_robotic = load1bppFontAsync("resources/fonts/RoboticFont.png");
	const font_robotic_bold = load1bppFontAsync("resources/fonts/BoldRoboticFont.png");

	const font_map = loadFontTableAsync("resources/fonts/VWF.lst");

	// TODO: Strip out control codes we won't use (end codes and speed codes)
	const modified_string = "Ah\n\nA shooting star!";

	// TODO: Split text to each text box (effectively every 2nd new line denotes a new box)
	// TODO: Split each box into lines
	const text_boxes = [["Ah."], ["A <b>shooting star</b>!"]];

	// TODO: For each text box, determine the necessary fonts
	const necessary_fonts = [ { 'default': font_default }, { 'default': font_default, 'default_bold': font_default_bold } ];

	// TODO: For each text box, determine the active portrait
	// Portraits are <[Position, Facing], Character ID, Expression ID>
	// Parse it out into the images we need to load, and the positions
	const portrait_positions = ['L', 'R'];
	const portrait_facings = ['L', 'R'];
	// TODO: Handle flipping as necessary
	const portrait_images = [loadImageAsync("resources/portraits/0/0.png"), loadImageAsync("resources/portraits/0/1.png")];

	// TODO: Determine what text box this needs to be in (if it's last, if the text is too long, etc...)
	const text_windows = [next_page_images[0], last_page_images[0]];

	for(let idx in text_boxes) 
	{
		const text = text_boxes[idx];
		const dependencies = [font_map];
		dependencies.push(text);
		dependencies.push(text_windows[idx]);
		dependencies.push(portrait_positions[idx]);
		dependencies.push(portrait_facings[idx]);
		dependencies.push(portrait_images[idx]);
		dependencies.push(necessary_fonts[idx]);
		yield dependencies;
	};
}

export const drawBox = async (dependencies) =>
{
	let [font_map, text, text_window, portrait_position, portrait_facing, portrait_image, necessary_fonts] = await Promise.all(dependencies);
	for( let key in necessary_fonts) { necessary_fonts[key] = await necessary_fonts[key]; }
	
	// Create a temporary canvas to draw this text box
	let element_canvas = document.createElement('canvas');
	let canvas_context = element_canvas.getContext('2d');
	
	element_canvas.height = 0;
	element_canvas.width = 0;

	// Keep track of where to draw text
	let current_x = 0;
	let current_y = 0;

	// Handle portraits
	if(portrait_image != null)
	{
		assert(portrait_position == 'L' || portrait_position == 'R');
		element_canvas.height = portrait_image.height;
		element_canvas.width = portrait_image.width;

		if(portrait_position == 'R')
		{
			assert(text_window.width > portrait_image.width);
			element_canvas.width = text_window.width;
			current_x += text_window.width - portrait_image.width;
		}
		
		assert(portrait_facing == 'L' || portrait_facing == 'R');

		if(portrait_facing == 'R')
		{
			canvas_context.scale(-1, 1);
			current_x += portrait_image.width;
			current_x *= -1;
		}

		canvas_context.drawImage(portrait_image, current_x, current_y);

		// Portrait won't affect x-coordinate
		current_y += portrait_image.height;
		current_x = 0;
	}

	// Draw the text box
	drawImageAndResizeVertical(element_canvas, text_window);

	// Initialize at one tile below and one tile over to bypass the border
	current_x += 1 * constants.TILE_WIDTH;
	current_y += 1 * constants.TILE_HEIGHT;

	let current_font = necessary_fonts['default']; 

	for(let line_number in text)
	{
		let line = text[line_number]
		for(let character_idx = 0; character_idx < line.length; character_idx++)
		{
			let character = line[character_idx];

			if(character == '<')
			{
				assert(current_font != null);
				let control_character = line[++character_idx];
				let special_data = "";
				while(line[++character_idx] != '>') {	special_data += line[character_idx]; }
				switch(control_character)
				{
					// We can realistically assume that at this stage every font we need has loaded, but we still have to await
					case 'b': if(current_font == necessary_fonts['robotic'] || current_font == necessary_fonts['robotic_bold']) { current_font = necessary_fonts['robotic_bold']; } else { current_font = necessary_fonts['default_bold']; } break;
					case 'i': if(current_font == necessary_fonts['default_bold'] || current_font == necessary_fonts['robotic_bold']) { current_font = necessary_fonts['robotic_bold']; } else { current_font = necessary_fonts['robotic']; } break;
					case '/':
					{
						switch(special_data)
						{
							case 'b':
							{
								if(current_font == necessary_fonts['robotic_bold']) { current_font = necessary_fonts['robotic']; }
								else if(current_font == necessary_fonts['default_bold']) { current_font = necessary_fonts['default']; }
								else { assert(false, "Mismatched bold terminator"); }
							}
							break;
							case 'i':
							{
								if(current_font == necessary_fonts['robotic_bold']) { current_font = necessary_fonts['default_bold']; }
								else if(current_font == necessary_fonts['robotic']) { current_font = necessary_fonts['default']; }
								else { assert(false, "Mismatched italic terminator"); }
							}
							break;
							default: assert(false, "Unknown control code termination: " + special_data);
						}
					}
					break;
					default: assert(false, "Unknown control code: " + control_character);
				}
				continue;
			}

			let [width, image_data] = current_font[font_map[character]];
			// Font Map will map characters to their respective character images
			// Font data is returned as an array of [Width, Image Data (for use with putImageData)]
			// The widths don't account for the one space between characters
			// We make a special case for 'space' which is 2
			// TODO: Maybe shouldn't assume spaces are always 2 pixels
			if(width == 0) { width = 2; }
			//canvas_context.putImageData(image_data, current_x, current_y);
			canvas_context.drawImage(image_data, current_x, current_y);
			current_x += width;

			// Add a space between characters
			current_x += 1;
		}
		current_y += 1 * constants.TILE_HEIGHT;
	}

	// TODO: Realistically should just be able to return the image data here and let the caller handle waiting
	return await loadImageAsync(element_canvas.toDataURL());
};
