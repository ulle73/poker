import './browser';
import { startTableObserver } from '../live/table-observer';
import { readSiteTable } from '../live/reader';
startTableObserver({capture:readSiteTable.bind(null,document),
  send:snapshot=>chrome.runtime.sendMessage({type:'snapshot',snapshot})});
