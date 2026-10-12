import '@fontsource/oswald/300.css';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import '@fontsource/oswald/700.css';
import '@fontsource/noto-kufi-arabic/400.css';
import '@fontsource/noto-kufi-arabic/600.css';
import './styles.css';

import { inject } from '@vercel/analytics';
import { initUI } from './ui.js';
import { initStage } from './scene/stage.js';

inject();
initUI();
initStage();
