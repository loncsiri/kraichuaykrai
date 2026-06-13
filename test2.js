const url = "https://script.google.com/macros/s/AKfycbwfMOeMoxOJVs370vXS6g8OcvFlJVd64fkMyQNf5BcdhVCF2gEZ95p3ivSCG-xCNkmmNg/exec";

async function test() {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action: 'sync',
        secretKey: 'kraichuaykrai-secret-1234',
        payload: []
      }),
    });
    
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
