import './style.css';
import { createScene } from './scene.js';
import { initUI } from './ui.js';

const view = createScene(document.getElementById('stage'));
initUI(view);
