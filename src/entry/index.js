import fetch from 'whatwg-fetch';
import Smartpush from "../lib/Smartpush";

window.fetch = fetch;
window.Smartpush = new Smartpush();