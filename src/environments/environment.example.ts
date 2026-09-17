export const environment = {
  production: true,
  // TODO: auf vServer-URL umstellen, sobald n8n dort gehostet wird
  n8nWebhookUrl: 'http://localhost:5678/webhook/generate-recipes',
  firebase: {
    apiKey: 'YOUR_API_KEY',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    databaseURL: 'https://your_project_id-default-rtdb.your_region.firebasedatabase.app/',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
    messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
};
