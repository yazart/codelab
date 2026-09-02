import '@void-web-dev/kit/button';
import '@void-web-dev/kit/dialog';
import '@void-web-dev/kit/card';
import '@void-web-dev/kit/badge';
import '@void-web-dev/kit/input';
import '@void-web-dev/kit/tokens.css';
import './styles.css';
import {CodelabApp} from './app/codelab-app';

customElements.define('codelab-app', CodelabApp);
