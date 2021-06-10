// General purpose utilities, not specific to the project

const loadImageAsync = (url) => 
(
  new Promise((resolve) =>
  {
    const image = new Image();
    image.addEventListener('load', () =>
    {
      resolve(image);
    });
    image.src = url;
  })
);

// Expects a perfect fit canvas (height = 0 if nothing is in it yet)
// This wouldn't be necessary if canvas provided a more convenient way to determine if something was already drawn
const drawImageAndResizeVertical = (element_canvas, img) =>
{
  var context = element_canvas.getContext('2d');
  var current_width = element_canvas.width;
  var current_height = element_canvas.height;
  var is_empty = current_height == 0 || current_width == 0;

  var data = is_empty ? null : context.getImageData(0, 0, current_width, current_height);

  element_canvas.height += img.height;
  element_canvas.width = current_width < img.width ? img.width : current_width;
  if(data) { context.putImageData(data, 0, 0); }

  context.drawImage(img, 0, current_height);
};

export { loadImageAsync, drawImageAndResizeVertical }
