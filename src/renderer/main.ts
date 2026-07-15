import { createApp } from "vue";
import App from "./App.vue";
import { i18n } from "./plugins/i18n";
import "./styles/main.scss";

createApp(App).use(i18n).mount("#app");
