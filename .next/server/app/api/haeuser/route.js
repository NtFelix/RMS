/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
(() => {
var exports = {};
exports.id = "app/api/haeuser/route";
exports.ids = ["app/api/haeuser/route"];
exports.modules = {

/***/ "(rsc)/./app/api/haeuser/route.ts":
/*!**********************************!*\
  !*** ./app/api/haeuser/route.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   POST: () => (/* binding */ POST)\n/* harmony export */ });\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n/* harmony import */ var _utils_supabase_server__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! @/utils/supabase/server */ \"(rsc)/./utils/supabase/server.ts\");\n\n\nasync function POST(request) {\n    try {\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_1__.createClient)();\n        const { name, strasse, ort } = await request.json();\n        if (!name || !strasse || !ort) {\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: \"Alle Felder (Name, Straße, Ort) sind erforderlich.\"\n            }, {\n                status: 400\n            });\n        }\n        const { data, error } = await supabase.from('Haeuser').insert({\n            name,\n            strasse,\n            ort\n        });\n        if (error) {\n            console.error(\"Supabase Insert Error:\", error);\n            return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n                error: error.message\n            }, {\n                status: 500\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(data, {\n            status: 201\n        });\n    } catch (e) {\n        console.error(\"POST /api/haeuser error:\", e);\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: \"Serverfehler beim Speichern des Hauses.\"\n        }, {\n            status: 500\n        });\n    }\n}\nasync function GET() {\n    const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_1__.createClient)();\n    const { data, error } = await supabase.from('Haeuser').select(\"*\");\n    if (error) {\n        return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json({\n            error: error.message\n        }, {\n            status: 500\n        });\n    }\n    return next_server__WEBPACK_IMPORTED_MODULE_0__.NextResponse.json(data, {\n        status: 200\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9hcHAvYXBpL2hhZXVzZXIvcm91dGUudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7OztBQUEwQztBQUNZO0FBRS9DLGVBQWVFLEtBQUtDLE9BQWdCO0lBQ3pDLElBQUk7UUFDRixNQUFNQyxXQUFXLE1BQU1ILG9FQUFZQTtRQUNuQyxNQUFNLEVBQUVJLElBQUksRUFBRUMsT0FBTyxFQUFFQyxHQUFHLEVBQUUsR0FBRyxNQUFNSixRQUFRSyxJQUFJO1FBQ2pELElBQUksQ0FBQ0gsUUFBUSxDQUFDQyxXQUFXLENBQUNDLEtBQUs7WUFDN0IsT0FBT1AscURBQVlBLENBQUNRLElBQUksQ0FBQztnQkFBRUMsT0FBTztZQUFxRCxHQUFHO2dCQUFFQyxRQUFRO1lBQUk7UUFDMUc7UUFDQSxNQUFNLEVBQUVDLElBQUksRUFBRUYsS0FBSyxFQUFFLEdBQUcsTUFBTUwsU0FBU1EsSUFBSSxDQUFDLFdBQVdDLE1BQU0sQ0FBQztZQUFFUjtZQUFNQztZQUFTQztRQUFJO1FBQ25GLElBQUlFLE9BQU87WUFDVEssUUFBUUwsS0FBSyxDQUFDLDBCQUEwQkE7WUFDeEMsT0FBT1QscURBQVlBLENBQUNRLElBQUksQ0FBQztnQkFBRUMsT0FBT0EsTUFBTU0sT0FBTztZQUFDLEdBQUc7Z0JBQUVMLFFBQVE7WUFBSTtRQUNuRTtRQUNBLE9BQU9WLHFEQUFZQSxDQUFDUSxJQUFJLENBQUNHLE1BQU07WUFBRUQsUUFBUTtRQUFJO0lBQy9DLEVBQUUsT0FBT00sR0FBRztRQUNWRixRQUFRTCxLQUFLLENBQUMsNEJBQTRCTztRQUMxQyxPQUFPaEIscURBQVlBLENBQUNRLElBQUksQ0FBQztZQUFFQyxPQUFPO1FBQTBDLEdBQUc7WUFBRUMsUUFBUTtRQUFJO0lBQy9GO0FBQ0Y7QUFFTyxlQUFlTztJQUNwQixNQUFNYixXQUFXLE1BQU1ILG9FQUFZQTtJQUNuQyxNQUFNLEVBQUVVLElBQUksRUFBRUYsS0FBSyxFQUFFLEdBQUcsTUFBTUwsU0FBU1EsSUFBSSxDQUFDLFdBQVdNLE1BQU0sQ0FBQztJQUM5RCxJQUFJVCxPQUFPO1FBQ1QsT0FBT1QscURBQVlBLENBQUNRLElBQUksQ0FBQztZQUFFQyxPQUFPQSxNQUFNTSxPQUFPO1FBQUMsR0FBRztZQUFFTCxRQUFRO1FBQUk7SUFDbkU7SUFDQSxPQUFPVixxREFBWUEsQ0FBQ1EsSUFBSSxDQUFDRyxNQUFNO1FBQUVELFFBQVE7SUFBSTtBQUMvQyIsInNvdXJjZXMiOlsiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy9hcHAvYXBpL2hhZXVzZXIvcm91dGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgTmV4dFJlc3BvbnNlIH0gZnJvbSBcIm5leHQvc2VydmVyXCJcbmltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gXCJAL3V0aWxzL3N1cGFiYXNlL3NlcnZlclwiXG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQT1NUKHJlcXVlc3Q6IFJlcXVlc3QpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpXG4gICAgY29uc3QgeyBuYW1lLCBzdHJhc3NlLCBvcnQgfSA9IGF3YWl0IHJlcXVlc3QuanNvbigpXG4gICAgaWYgKCFuYW1lIHx8ICFzdHJhc3NlIHx8ICFvcnQpIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBcIkFsbGUgRmVsZGVyIChOYW1lLCBTdHJhw59lLCBPcnQpIHNpbmQgZXJmb3JkZXJsaWNoLlwiIH0sIHsgc3RhdHVzOiA0MDAgfSlcbiAgICB9XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuZnJvbSgnSGFldXNlcicpLmluc2VydCh7IG5hbWUsIHN0cmFzc2UsIG9ydCB9KVxuICAgIGlmIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihcIlN1cGFiYXNlIEluc2VydCBFcnJvcjpcIiwgZXJyb3IpXG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9LCB7IHN0YXR1czogNTAwIH0pXG4gICAgfVxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihkYXRhLCB7IHN0YXR1czogMjAxIH0pXG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiUE9TVCAvYXBpL2hhZXVzZXIgZXJyb3I6XCIsIGUpXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IFwiU2VydmVyZmVobGVyIGJlaW0gU3BlaWNoZXJuIGRlcyBIYXVzZXMuXCIgfSwgeyBzdGF0dXM6IDUwMCB9KVxuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBHRVQoKSB7XG4gIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KClcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuZnJvbSgnSGFldXNlcicpLnNlbGVjdChcIipcIilcbiAgaWYgKGVycm9yKSB7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSwgeyBzdGF0dXM6IDUwMCB9KVxuICB9XG4gIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihkYXRhLCB7IHN0YXR1czogMjAwIH0pXG59XG4iXSwibmFtZXMiOlsiTmV4dFJlc3BvbnNlIiwiY3JlYXRlQ2xpZW50IiwiUE9TVCIsInJlcXVlc3QiLCJzdXBhYmFzZSIsIm5hbWUiLCJzdHJhc3NlIiwib3J0IiwianNvbiIsImVycm9yIiwic3RhdHVzIiwiZGF0YSIsImZyb20iLCJpbnNlcnQiLCJjb25zb2xlIiwibWVzc2FnZSIsImUiLCJHRVQiLCJzZWxlY3QiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/haeuser/route.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fhaeuser%2Froute&page=%2Fapi%2Fhaeuser%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fhaeuser%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fhaeuser%2Froute&page=%2Fapi%2Fhaeuser%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fhaeuser%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_felixplant_Downloads_Felix_GitHub_Repo_RMS_app_api_haeuser_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/haeuser/route.ts */ \"(rsc)/./app/api/haeuser/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/haeuser/route\",\n        pathname: \"/api/haeuser\",\n        filename: \"route\",\n        bundlePath: \"app/api/haeuser/route\"\n    },\n    resolvedPagePath: \"/Users/felixplant/Downloads/Felix/GitHub-Repo/RMS/app/api/haeuser/route.ts\",\n    nextConfigOutput,\n    userland: _Users_felixplant_Downloads_Felix_GitHub_Repo_RMS_app_api_haeuser_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZoYWV1c2VyJTJGcm91dGUmcGFnZT0lMkZhcGklMkZoYWV1c2VyJTJGcm91dGUmYXBwUGF0aHM9JnBhZ2VQYXRoPXByaXZhdGUtbmV4dC1hcHAtZGlyJTJGYXBpJTJGaGFldXNlciUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmZlbGl4cGxhbnQlMkZEb3dubG9hZHMlMkZGZWxpeCUyRkdpdEh1Yi1SZXBvJTJGUk1TJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRmZlbGl4cGxhbnQlMkZEb3dubG9hZHMlMkZGZWxpeCUyRkdpdEh1Yi1SZXBvJTJGUk1TJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUErRjtBQUN2QztBQUNxQjtBQUMwQjtBQUN2RztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy9hcHAvYXBpL2hhZXVzZXIvcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2hhZXVzZXIvcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9oYWV1c2VyXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9oYWV1c2VyL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy9hcHAvYXBpL2hhZXVzZXIvcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICB3b3JrQXN5bmNTdG9yYWdlLFxuICAgICAgICB3b3JrVW5pdEFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fhaeuser%2Froute&page=%2Fapi%2Fhaeuser%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fhaeuser%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "(rsc)/./utils/supabase/server.ts":
/*!**********************************!*\
  !*** ./utils/supabase/server.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   createClient: () => (/* binding */ createClient)\n/* harmony export */ });\n/* harmony import */ var _supabase_ssr__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @supabase/ssr */ \"(rsc)/./node_modules/@supabase/ssr/dist/module/index.js\");\n/* harmony import */ var next_headers__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/headers */ \"(rsc)/./node_modules/next/dist/api/headers.js\");\n\n\nasync function createClient() {\n    const cookieStore = (0,next_headers__WEBPACK_IMPORTED_MODULE_1__.cookies)();\n    return (0,_supabase_ssr__WEBPACK_IMPORTED_MODULE_0__.createServerClient)(\"https://ocubnwzybybcbrhsnqqs.supabase.co\", \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9jdWJud3p5YnliY2JyaHNucXFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUxNjUyMDEsImV4cCI6MjA2MDc0MTIwMX0.eNxDYHXxpWje_7YUOnWPXsvNNmK9eXpYaArvX6t0ZQQ\", {\n        cookies: {\n            async get (name) {\n                const store = await cookieStore;\n                return store.get(name)?.value;\n            },\n            async set (name, value, options) {\n                const store = await cookieStore;\n                store.set({\n                    name,\n                    value,\n                    ...options\n                });\n            },\n            async remove (name, options) {\n                const store = await cookieStore;\n                store.set({\n                    name,\n                    value: \"\",\n                    ...options\n                });\n            }\n        }\n    });\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi91dGlscy9zdXBhYmFzZS9zZXJ2ZXIudHMiLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQWtEO0FBQ1o7QUFFL0IsZUFBZUU7SUFDcEIsTUFBTUMsY0FBY0YscURBQU9BO0lBRTNCLE9BQU9ELGlFQUFrQkEsQ0FBQ0ksMENBQW9DLEVBQUdBLGtOQUF5QyxFQUFHO1FBQzNHSCxTQUFTO1lBQ1AsTUFBTU8sS0FBSUMsSUFBWTtnQkFDcEIsTUFBTUMsUUFBUSxNQUFNUDtnQkFDcEIsT0FBT08sTUFBTUYsR0FBRyxDQUFDQyxPQUFPRTtZQUMxQjtZQUNBLE1BQU1DLEtBQUlILElBQVksRUFBRUUsS0FBYSxFQUFFRSxPQUFZO2dCQUNqRCxNQUFNSCxRQUFRLE1BQU1QO2dCQUNwQk8sTUFBTUUsR0FBRyxDQUFDO29CQUFFSDtvQkFBTUU7b0JBQU8sR0FBR0UsT0FBTztnQkFBQztZQUN0QztZQUNBLE1BQU1DLFFBQU9MLElBQVksRUFBRUksT0FBWTtnQkFDckMsTUFBTUgsUUFBUSxNQUFNUDtnQkFDcEJPLE1BQU1FLEdBQUcsQ0FBQztvQkFBRUg7b0JBQU1FLE9BQU87b0JBQUksR0FBR0UsT0FBTztnQkFBQztZQUMxQztRQUNGO0lBQ0Y7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy91dGlscy9zdXBhYmFzZS9zZXJ2ZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlU2VydmVyQ2xpZW50IH0gZnJvbSBcIkBzdXBhYmFzZS9zc3JcIlxuaW1wb3J0IHsgY29va2llcyB9IGZyb20gXCJuZXh0L2hlYWRlcnNcIlxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlQ2xpZW50KCkge1xuICBjb25zdCBjb29raWVTdG9yZSA9IGNvb2tpZXMoKVxuXG4gIHJldHVybiBjcmVhdGVTZXJ2ZXJDbGllbnQocHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfVVJMISwgcHJvY2Vzcy5lbnYuTkVYVF9QVUJMSUNfU1VQQUJBU0VfQU5PTl9LRVkhLCB7XG4gICAgY29va2llczoge1xuICAgICAgYXN5bmMgZ2V0KG5hbWU6IHN0cmluZykge1xuICAgICAgICBjb25zdCBzdG9yZSA9IGF3YWl0IGNvb2tpZVN0b3JlO1xuICAgICAgICByZXR1cm4gc3RvcmUuZ2V0KG5hbWUpPy52YWx1ZTtcbiAgICAgIH0sXG4gICAgICBhc3luYyBzZXQobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nLCBvcHRpb25zOiBhbnkpIHtcbiAgICAgICAgY29uc3Qgc3RvcmUgPSBhd2FpdCBjb29raWVTdG9yZTtcbiAgICAgICAgc3RvcmUuc2V0KHsgbmFtZSwgdmFsdWUsIC4uLm9wdGlvbnMgfSk7XG4gICAgICB9LFxuICAgICAgYXN5bmMgcmVtb3ZlKG5hbWU6IHN0cmluZywgb3B0aW9uczogYW55KSB7XG4gICAgICAgIGNvbnN0IHN0b3JlID0gYXdhaXQgY29va2llU3RvcmU7XG4gICAgICAgIHN0b3JlLnNldCh7IG5hbWUsIHZhbHVlOiBcIlwiLCAuLi5vcHRpb25zIH0pO1xuICAgICAgfSxcbiAgICB9LFxuICB9KVxufVxuIl0sIm5hbWVzIjpbImNyZWF0ZVNlcnZlckNsaWVudCIsImNvb2tpZXMiLCJjcmVhdGVDbGllbnQiLCJjb29raWVTdG9yZSIsInByb2Nlc3MiLCJlbnYiLCJORVhUX1BVQkxJQ19TVVBBQkFTRV9VUkwiLCJORVhUX1BVQkxJQ19TVVBBQkFTRV9BTk9OX0tFWSIsImdldCIsIm5hbWUiLCJzdG9yZSIsInZhbHVlIiwic2V0Iiwib3B0aW9ucyIsInJlbW92ZSJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./utils/supabase/server.ts\n");

/***/ }),

/***/ "(ssr)/./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true!":
/*!******************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-flight-client-entry-loader.js?server=true! ***!
  \******************************************************************************************************/
/***/ (() => {



/***/ }),

/***/ "../app-render/after-task-async-storage.external":
/*!***********************************************************************************!*\
  !*** external "next/dist/server/app-render/after-task-async-storage.external.js" ***!
  \***********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/after-task-async-storage.external.js");

/***/ }),

/***/ "../app-render/work-async-storage.external":
/*!*****************************************************************************!*\
  !*** external "next/dist/server/app-render/work-async-storage.external.js" ***!
  \*****************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-async-storage.external.js");

/***/ }),

/***/ "./work-unit-async-storage.external":
/*!**********************************************************************************!*\
  !*** external "next/dist/server/app-render/work-unit-async-storage.external.js" ***!
  \**********************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/server/app-render/work-unit-async-storage.external.js");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

"use strict";
module.exports = require("https");

/***/ }),

/***/ "next/dist/compiled/next-server/app-page.runtime.dev.js":
/*!*************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-page.runtime.dev.js" ***!
  \*************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-page.runtime.dev.js");

/***/ }),

/***/ "next/dist/compiled/next-server/app-route.runtime.dev.js":
/*!**************************************************************************!*\
  !*** external "next/dist/compiled/next-server/app-route.runtime.dev.js" ***!
  \**************************************************************************/
/***/ ((module) => {

"use strict";
module.exports = require("next/dist/compiled/next-server/app-route.runtime.dev.js");

/***/ }),

/***/ "punycode":
/*!***************************!*\
  !*** external "punycode" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("punycode");

/***/ }),

/***/ "stream":
/*!*************************!*\
  !*** external "stream" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("stream");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

"use strict";
module.exports = require("url");

/***/ }),

/***/ "zlib":
/*!***********************!*\
  !*** external "zlib" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("zlib");

/***/ })

};
;

// load runtime
var __webpack_require__ = require("../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/cookie","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fhaeuser%2Froute&page=%2Fapi%2Fhaeuser%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fhaeuser%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();