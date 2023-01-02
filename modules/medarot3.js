// Medarot 3 specific implementation details

import * as constants from './const.js'
import { assert, loadImageAsync, loadListAsync, drawImageAndResizeVertical } from './utils.js';
import { load1bppFontAsync } from './font.js'

// Maintain a cache of promises if we've already loaded certain files
const resource_cache = {};
const checkResourceCache = async (filename, fn) =>
{
	if (!(filename in resource_cache)) { resource_cache[filename] = fn(filename); }
	return resource_cache[filename];
}

// Preload things in initialize
// In our case, we need the font metadata
let font_types = checkResourceCache("resources/fonts/FontTypes.lst", loadListAsync);
let font_map = checkResourceCache("resources/fonts/VWF.lst", loadListAsync);
export const initialize = async () =>
{
	font_types = Object.assign({}, ...Object.entries(await font_types).map(([a,b]) => ({ [b]: a })));
	font_map = await font_map;
}

// Input: Game-ready string
// Output: Game-ready string with <D3> inserted as necessary to auto-break newlines
// Note this function isn't asynchronous
const LINE_PIXEL_LIMIT = constants.FONT_CHARACTER_WIDTH * 16;
export const autoLinebreak = async (text) =>
{
	let current_font = await checkResourceCache("resources/fonts/" + font_types[0] + ".png", load1bppFontAsync);
	assert(current_font != null);

	let final_text = "";
	let current_line_len = 0;

	for(let word of text.split(/(<.*?>|\s)/g))
	{
		if (word.length == 0 || word == " ") continue; // Short-circuit empty splits and spaces, as those are handled separately

		let current_word_len = 0;
		let add_space = false;

		if (word[0] == '<' && word[word.length - 1] == '>')
		{
			// If it's a control code, handle it accordingly
			let control = word[1];
			let params = "";

			let i = 2;
			while(word[i] != ">")
			{
				assert(i < word.length);
				params += word[i++];
			}

			switch(control)
			{
				case 'f':
					current_font = await checkResourceCache("resources/fonts/" + font_types[parseInt(params)] + ".png", load1bppFontAsync);
					break;
				case '&':
					current_word_len = 8 * (current_font[font_map['~']][0] + 1) - 1; // Default to 8 tiles worth, accounting for 1 pixel between characters
					add_space = current_line_len != 0;
					break;
				case 'C':
					if (params == 'D' || params == 'F')
					{
						// New line or new page
						current_line_len = 0;
					}
					break;
				case 'D':
					if (params == '1' || params == '3')
					{
						// New page w/o input
						current_line_len = 0;
					}
					break;
				default: // Don't count it towards anything
					break;
			}
		}
		else	
		{
			for(let i = 0; i < word.length; i++)
			{
				let ch = word[i];
				let ch_len = 0;
				
				ch_len = current_font[font_map[ch]][0];
				current_word_len += ch_len;

				// If it's not the last character, account for the space between letters
				if (i + 1 != word.length)
					current_word_len++;
			}

			add_space = current_line_len != 0;
		}

		if(add_space)
		{
			current_word_len += 2;
		}

		if (current_word_len + current_line_len > LINE_PIXEL_LIMIT)
		{
			// Trigger linebreak
			current_line_len = 0;
			final_text += "<D3>";
			if (add_space)
			{
				current_word_len -= 2;
				add_space = false;
			}
		}

		if (add_space)
		{
			final_text += " ";
		}

		final_text += word;
		current_line_len += current_word_len;
	}
	return final_text;
}

// Input: Game-ready string
// Output: Generator that yields each text box's array of dependencies to use in the drawBox functions
// Will take input text and determine what to do with it
export function* getDependencies(dialog_string)
{
	// Handle all the new line characters
  	let modified_string = dialog_string;
  	modified_string = modified_string.replaceAll("<CD>", "\n"); // New line
  	modified_string = modified_string.replaceAll("<CF>", "\n\n"); // New page w/ input
  	modified_string = modified_string.replaceAll("<D1>", "\n\n"); // New page w/o input

  	modified_string = modified_string.replace(/\<&[a-zA-Z0-9]+\>/g,"~~~~~~~~"); // Assume the longest length (8 * 8)
	modified_string = modified_string.replace(/<\*.+?>/g,""); // Get rid of exit codes
  	modified_string = modified_string.replace(/<S.+?>/g,""); // Get rid of special effects

  	let final_string = "";
  	// D3 is considered a new line if it's on the first line, or a new box if it's on the second
  	{
  		let second_line = false;
		for(let line of modified_string.split('\n'))
  		{
  			let split_line = line.split("<D3>");
  			for(let l of split_line)
  			{
  				final_string += l;
  				final_string += second_line ? '\n\n' : '\n';
  				second_line = !second_line;
  			}
  			second_line = !second_line;
  		}
  		// Remove the unnecessary final new line
  		final_string = final_string.slice(0, -1);
  	}

  	const text_boxes = [];
  	const text_windows = [];
  	const necessary_fonts = [];
  	const portrait_positions = [];
  	const portrait_facings = [];
  	const portrait_images = [];

  	final_string.split("\n\n").forEach((text) => 
  	{
		// Handle raw text
		const modified_text = text.replace(/<@.+?>/,"").split("\n"); // Remove portraits before adding it to the text boxes
  		text_boxes.push(modified_text);

		// Handle portraits
		const portrait_info = text.match(/^<@([L|R|C])([L|R|C]),([0-9A-F][0-9A-F]),([0-9A-F][0-9A-F])>/); // Portraits are <@[Position, Facing], Character ID, Expression ID>
		
		// Default to the previous portrait
		let portrait_position = portrait_positions.length > 0 ? portrait_positions[portrait_positions.length - 1] : null;
		let portrait_facing = portrait_facings.length > 0 ? portrait_facings[portrait_facings.length - 1] : null;
		let portrait_image = portrait_images.length > 0 ? portrait_images[portrait_images.length - 1] : null;

		if(portrait_info != null)
		{
			let portrait_character = null;
			let portrait_expression = null;

			[, portrait_position, portrait_facing, portrait_character, portrait_expression] = portrait_info

			assert(portrait_position != "C" || portrait_facing == "C"); // Both must be true
			if(portrait_position != "C")
			{
				portrait_character = parseInt(portrait_character, 16);
				portrait_expression = parseInt(portrait_expression, 16);
				portrait_image = `${portrait_character}/${portrait_expression}`;
			}
			else
			{
				portrait_character = null;
				portrait_expression = null;
				portrait_image = null;
			}
		}

		portrait_positions.push(portrait_position);
		portrait_facings.push(portrait_facing);
		portrait_images.push(portrait_image);

		// Handle fonts
		const font_info = text.match(/<f[0-9A-F][0-9A-F]>/g) ?? [];
		
		let necessary_font = { 0: font_types[0], };

		font_info.forEach((font_code) => 
		{
			let idx = parseInt(font_code.match(/f([0-9A-F][0-9A-F])/)[1]);
			necessary_font[idx] = font_types[idx];
		});

  		necessary_fonts.push(necessary_font);

  		// TODO: Determine if the text is going to go over somehow
  		text_windows.push("next-page");
  	});

  	text_windows[text_windows.length - 1] = "last-page";

	for(let idx in text_boxes) 
	{
		const text = text_boxes[idx];
		const dependencies = [text];
		dependencies.push(checkResourceCache("resources/window/" + text_windows[idx] + ".png", loadImageAsync));
		dependencies.push(portrait_positions[idx]);
		dependencies.push(portrait_facings[idx]);
		dependencies.push(portrait_images[idx] ? checkResourceCache("resources/portraits/" + portrait_images[idx] + ".png", loadImageAsync) : null);
		for(let key in necessary_fonts[idx]) { necessary_fonts[idx][key] = checkResourceCache("resources/fonts/" + necessary_fonts[idx][key] + ".png", load1bppFontAsync); }
		dependencies.push(necessary_fonts[idx]);
		yield dependencies;
	};
}

export const drawBox = async (dependencies) =>
{
	let [text, text_window, portrait_position, portrait_facing, portrait_image, necessary_fonts] = await Promise.all(dependencies);
	for(let key in necessary_fonts) { necessary_fonts[key] = await necessary_fonts[key]; }
	
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

	let current_font = necessary_fonts[0]; 

	for(let line_number in text)
	{
		// Initialize at one tile below to bypass the border
		// Always reset x-coordinate
		current_y += 1 * constants.TILE_HEIGHT;
		current_x = 1 * constants.TILE_WIDTH;

		let line = text[line_number]
		
		for(let character_idx = 0; character_idx < line.length; character_idx++)
		{
			let character = line[character_idx];

			if(character == '<')
			{
				assert(current_font != null);
				let control_character = line[++character_idx];
				let special_data = "";
				while(line[++character_idx] != '>') { special_data += line[character_idx]; }
				switch(control_character)
				{
					case 'f': current_font = necessary_fonts[parseInt(special_data)]; break;
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
