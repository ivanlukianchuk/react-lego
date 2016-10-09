import React from 'react';
import { renderToString } from 'react-dom/server';
import koa from 'koa';
import debug from 'debug';
import koaStatic from 'koa-static';
import compress from 'koa-compress';

import logger from './middleware/logger';
import responseTime from './middleware/response-time';
import headers from './middleware/headers';
import Error500 from './templates/Error500';
import webpackConfig from '../config/webpack.config.prod';
import setRouterContext from './middleware/set-router-context';
import renderApp from './middleware/render-app';
import { DIST, PUBLIC } from '../config/paths';

const server = koa();
const log = debug('lego:server.js');
log('starting');
const publicFiles = koaStatic(PUBLIC);
publicFiles._name = 'koaStatic /public'; // eslint-disable-line no-underscore-dangle
const distFiles = koaStatic(DIST);
distFiles._name = 'koaStatic /dist'; // eslint-disable-line no-underscore-dangle

const webpackEntries = Object.keys(webpackConfig.entry);
const assets = {
  javascript: webpackEntries.map((entry) => `/${entry}.js`),
  styles: webpackEntries.map((entry) => `/${entry}.css`)
};

function addRenderFunctions() {
  return function* genAddRenderFunctions(next) {
    this.renderPageToString = function renderPageToString(page) {
      return `<!doctype html>${renderToString(page)}`;
    };
    this.render500 = function render500(e) {
      log('render500', e);
      this.response.status = 500;
      return this.renderPageToString(<Error500 />);
    };
    yield next;
  };
}

server.use(responseTime());
server.use(compress({ threshold: 2048 }));
server.use(logger());
server.use(distFiles);
server.use(publicFiles);
server.use(headers());
server.use(addRenderFunctions());
server.use(setRouterContext());
server.use(renderApp(assets));

export default server;
