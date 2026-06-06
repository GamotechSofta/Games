/**
 * Must load before route modules so every router handler is wrapped for async errors.
 */
import express from 'express';
import { asyncHandler } from './middleware/apiMiddleware.js';

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'all'];

for (const method of METHODS) {
  const original = express.Router.prototype[method];
  express.Router.prototype[method] = function patchedRouterMethod(path, ...handlers) {
    const wrapped = handlers.map((handler) => (
      typeof handler === 'function' ? asyncHandler(handler) : handler
    ));
    return original.call(this, path, ...wrapped);
  };
}
