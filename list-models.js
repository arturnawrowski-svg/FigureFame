const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI('AIzaSyAGH_0Ip7F0HizkUPc6yemDDPtp9EN4-rk');

async function list() {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyAGH_0Ip7F0HizkUPc6yemDDPtp9EN4-rk');
    const data = await response.json();
    console.log(data.models.map(m => m.name).join('\n'));
  } catch(e) {
    console.error(e);
  }
}
list();
