
import { createApp } from 'vue';
import App from './App.vue';
import vuetify from './plugins/vuetify.js';
import router from './router.js';

const app = createApp(App);
app.use(vuetify);
app.use(router);
app.mount('#app');
