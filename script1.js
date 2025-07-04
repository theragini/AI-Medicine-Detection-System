// Get references to HTML elements
const video = document.getElementById('video');
const captureButton = document.getElementById('capture-button');
const capturedImageContainer = document.getElementById('captured-image-container');
const capturedImage = document.getElementById('captured-image');
const recognizedTextContainer = document.getElementById('recognized-text-container');
const recognizedText = document.getElementById('recognized-text');

// Set up webcam streaming
navigator.mediaDevices.getUserMedia({ video: true })
  .then(stream => {
    video.srcObject = stream;
  })
  .catch(error => {
    console.error('Error accessing webcam:', error);
  });

// Capture image on button click
captureButton.addEventListener('click', () => {
  // Create a canvas to draw the video frame
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // Apply grayscale conversion
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;  // Calculate the grayscale value
    data[i] = avg;        // Red
    data[i + 1] = avg;    // Green
    data[i + 2] = avg;    // Blue
  }

  ctx.putImageData(imageData, 0, 0);

  // Optional: Contrast Enhancement (Simple contrast stretching)
  enhanceContrast(ctx, canvas);

  // Convert canvas to image data URL
  const imageDataURL = canvas.toDataURL('image/jpeg', 1.0);

  // Display the captured image
  capturedImage.src = imageDataURL;
  capturedImageContainer.style.display = 'block';

  // Recognize text using Tesseract
  Tesseract.recognize(imageDataURL, 'eng', { pageSegMode: 6 })  // Single block of text
    .then(result => {
      const recognizedTextValue = result.data.text.trim();

      // Display recognized text
      recognizedText.innerText = recognizedTextValue;
      recognizedTextContainer.style.display = 'block';
      console.log('Recognized Text:', recognizedTextValue);

      // Fetch multiple JSON datasets and search for recognized text
      Promise.all([
       //fetch('medicine_data.json').then(response => response.json()),
       fetch('dataset.json').then(response => response.json()),
      // fetch('amoxicillin.json').then(response => response.json()),

        // Add more datasets here if necessary
      ])
      .then(datasets => {
        let matchedData = null;

        // Search through each dataset
        datasets.forEach(dataset => {
          if (!matchedData) {
            matchedData = searchInDataset(recognizedTextValue, dataset);
          }
        });

        if (matchedData) {
          // Display matched data
          displayMatchedData(matchedData);
          // Speak the matched data as voice output
          speakText(`Name: ${matchedData.name}. Description: ${matchedData.description}. Dosage: ${matchedData.dosage}`);
        } else {
          console.log('No matching data found.');
          speakText("No matching data found, please try again. make sure image is clear");
        }
      })
      .catch(err => {
        console.error('Error fetching datasets:', err);
      });
    })
    .catch(err => {
      console.error('Text recognition error:', err);
    });
});

/**
 * Function to enhance the contrast of the image on the canvas.
 * This simple contrast enhancement method uses linear contrast stretching.
 */
function enhanceContrast(ctx, canvas) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let min = 255, max = 0;

  // Find min and max intensity
  for (let i = 0; i < data.length; i += 4) {
    let intensity = data[i];  // As it's grayscale, red (data[i]) represents intensity
    if (intensity < min) min = intensity;
    if (intensity > max) max = intensity;
  }

  // Stretch the intensity range
  for (let i = 0; i < data.length; i += 4) {
    data[i] = ((data[i] - min) * 255) / (max - min);    // Red
    data[i + 1] = ((data[i + 1] - min) * 255) / (max - min);  // Green
    data[i + 2] = ((data[i + 2] - min) * 255) / (max - min);  // Blue
  }

  ctx.putImageData(imageData, 0, 0);
}

// Function to search for recognized text in the dataset
function searchInDataset(recognizedText, dataset) {
  for (let key in dataset) {
    if (recognizedText.toLowerCase().includes(key.toLowerCase())) {
      return dataset[key];
    }
  }
  return null;  // Return null if no match is found
}

// Function to display matched data
function displayMatchedData(matchedData) {
  recognizedText.innerText += `\n\nMatched Data:\nName: ${matchedData.name}\nDescription: ${matchedData.description}\nDosage: ${matchedData.dosage}`;
}

// Function to convert matched data to speech
// Function to convert matched data to speech in Hindi
function speakText(text) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text); // Create the utterance
    utterance.lang = 'hi-IN'; // Set language to Hindi

    // Optional: Get available voices and set a Hindi voice if available
    window.speechSynthesis.onvoiceschanged = () => {
      const voices = window.speechSynthesis.getVoices();
      const hindiVoice = voices.find(voice => voice.lang === 'hi-IN'); // Find Hindi voice

      if (hindiVoice) {
        utterance.voice = hindiVoice; // Set the Hindi voice
      }
      window.speechSynthesis.speak(utterance); // Speak the text
    };

    // If voices are already loaded, speak immediately
    if (window.speechSynthesis.getVoices().length) {
      window.speechSynthesis.speak(utterance);
    }
  } else {
    console.error('Speech Synthesis not supported in this browser.');
  }
  
}

