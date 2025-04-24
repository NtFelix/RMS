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
exports.id = "app/api/finanzen/route";
exports.ids = ["app/api/finanzen/route"];
exports.modules = {

/***/ "(rsc)/./app/api/finanzen/route.ts":
/*!***********************************!*\
  !*** ./app/api/finanzen/route.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   DELETE: () => (/* binding */ DELETE),\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   POST: () => (/* binding */ POST),\n/* harmony export */   PUT: () => (/* binding */ PUT)\n/* harmony export */ });\n/* harmony import */ var _utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/utils/supabase/server */ \"(rsc)/./utils/supabase/server.ts\");\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n\n\nasync function GET() {\n    try {\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const { data, error } = await supabase.from('Finanzen').select('*, Wohnungen(name)').order('datum', {\n            ascending: false\n        });\n        if (error) {\n            console.error('GET /api/finanzen error:', error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message\n            }, {\n                status: 500\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(data, {\n            status: 200\n        });\n    } catch (e) {\n        console.error('Server error GET /api/finanzen:', e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Serverfehler bei Finanzen-Abfrage.'\n        }, {\n            status: 500\n        });\n    }\n}\nasync function POST(request) {\n    try {\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const data = await request.json();\n        console.log('POST /api/finanzen payload:', data);\n        const { error, data: result } = await supabase.from('Finanzen').insert(data).select();\n        if (error) {\n            console.error('POST /api/finanzen error:', error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message,\n                code: error.code,\n                details: error.details\n            }, {\n                status: 400\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(result[0], {\n            status: 201\n        });\n    } catch (e) {\n        console.error('Server error POST /api/finanzen:', e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Serverfehler beim Erstellen der Transaktion.'\n        }, {\n            status: 500\n        });\n    }\n}\nasync function PUT(request) {\n    try {\n        const url = new URL(request.url);\n        const id = url.searchParams.get('id');\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const data = await request.json();\n        const { error, data: result } = await supabase.from('Finanzen').update(data).match({\n            id\n        }).select();\n        if (error) {\n            console.error('PUT /api/finanzen error:', error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message,\n                code: error.code,\n                details: error.details\n            }, {\n                status: 400\n            });\n        }\n        if (!result || result.length === 0) {\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: 'Transaktion nicht gefunden.'\n            }, {\n                status: 404\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(result[0], {\n            status: 200\n        });\n    } catch (e) {\n        console.error('Server error PUT /api/finanzen:', e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Serverfehler beim Aktualisieren der Transaktion.'\n        }, {\n            status: 500\n        });\n    }\n}\nasync function DELETE(request) {\n    try {\n        const url = new URL(request.url);\n        const id = url.searchParams.get('id');\n        if (!id) {\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: 'Transaktions-ID erforderlich.'\n            }, {\n                status: 400\n            });\n        }\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const { error } = await supabase.from('Finanzen').delete().match({\n            id\n        });\n        if (error) {\n            console.error('DELETE /api/finanzen error:', error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message\n            }, {\n                status: 500\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            message: 'Transaktion gelöscht'\n        }, {\n            status: 200\n        });\n    } catch (e) {\n        console.error('Server error DELETE /api/finanzen:', e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Serverfehler beim Löschen der Transaktion.'\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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TztRQUE2QyxHQUFHO1lBQUVRLFFBQVE7UUFBSTtJQUNsRztBQUNGIiwic291cmNlcyI6WyIvVXNlcnMvZmVsaXhwbGFudC9Eb3dubG9hZHMvRmVsaXgvR2l0SHViLVJlcG8vUk1TL2FwcC9hcGkvZmluYW56ZW4vcm91dGUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgY3JlYXRlQ2xpZW50IH0gZnJvbSBcIkAvdXRpbHMvc3VwYWJhc2Uvc2VydmVyXCI7XG5pbXBvcnQgeyBOZXh0UmVzcG9uc2UgfSBmcm9tIFwibmV4dC9zZXJ2ZXJcIjtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVCgpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnRmluYW56ZW4nKVxuICAgICAgLnNlbGVjdCgnKiwgV29obnVuZ2VuKG5hbWUpJylcbiAgICAgIC5vcmRlcignZGF0dW0nLCB7IGFzY2VuZGluZzogZmFsc2UgfSk7XG4gICAgICBcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0dFVCAvYXBpL2ZpbmFuemVuIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gICAgfVxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihkYXRhLCB7IHN0YXR1czogMjAwIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcignU2VydmVyIGVycm9yIEdFVCAvYXBpL2ZpbmFuemVuOicsIGUpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnU2VydmVyZmVobGVyIGJlaSBGaW5hbnplbi1BYmZyYWdlLicgfSwgeyBzdGF0dXM6IDUwMCB9KTtcbiAgfVxufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gUE9TVChyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVxdWVzdC5qc29uKCk7XG4gICAgY29uc29sZS5sb2coJ1BPU1QgL2FwaS9maW5hbnplbiBwYXlsb2FkOicsIGRhdGEpO1xuICAgIFxuICAgIGNvbnN0IHsgZXJyb3IsIGRhdGE6IHJlc3VsdCB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdGaW5hbnplbicpXG4gICAgICAuaW5zZXJ0KGRhdGEpXG4gICAgICAuc2VsZWN0KCk7XG4gICAgICBcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1BPU1QgL2FwaS9maW5hbnplbiBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogZXJyb3IubWVzc2FnZSwgY29kZTogZXJyb3IuY29kZSwgZGV0YWlsczogZXJyb3IuZGV0YWlscyB9LCB7IHN0YXR1czogNDAwIH0pO1xuICAgIH1cbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24ocmVzdWx0WzBdLCB7IHN0YXR1czogMjAxIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcignU2VydmVyIGVycm9yIFBPU1QgL2FwaS9maW5hbnplbjonLCBlKTtcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogJ1NlcnZlcmZlaGxlciBiZWltIEVyc3RlbGxlbiBkZXIgVHJhbnNha3Rpb24uJyB9LCB7IHN0YXR1czogNTAwIH0pO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQVVQocmVxdWVzdDogUmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxdWVzdC51cmwpO1xuICAgIGNvbnN0IGlkID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2lkJyk7XG4gICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgICBjb25zdCBkYXRhID0gYXdhaXQgcmVxdWVzdC5qc29uKCk7XG4gICAgXG4gICAgY29uc3QgeyBlcnJvciwgZGF0YTogcmVzdWx0IH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgLmZyb20oJ0ZpbmFuemVuJylcbiAgICAgIC51cGRhdGUoZGF0YSlcbiAgICAgIC5tYXRjaCh7IGlkIH0pXG4gICAgICAuc2VsZWN0KCk7XG4gICAgICBcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1BVVCAvYXBpL2ZpbmFuemVuIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBlcnJvci5tZXNzYWdlLCBjb2RlOiBlcnJvci5jb2RlLCBkZXRhaWxzOiBlcnJvci5kZXRhaWxzIH0sIHsgc3RhdHVzOiA0MDAgfSk7XG4gICAgfVxuICAgIFxuICAgIGlmICghcmVzdWx0IHx8IHJlc3VsdC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnVHJhbnNha3Rpb24gbmljaHQgZ2VmdW5kZW4uJyB9LCB7IHN0YXR1czogNDA0IH0pO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24ocmVzdWx0WzBdLCB7IHN0YXR1czogMjAwIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcignU2VydmVyIGVycm9yIFBVVCAvYXBpL2ZpbmFuemVuOicsIGUpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnU2VydmVyZmVobGVyIGJlaW0gQWt0dWFsaXNpZXJlbiBkZXIgVHJhbnNha3Rpb24uJyB9LCB7IHN0YXR1czogNTAwIH0pO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBERUxFVEUocmVxdWVzdDogUmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxdWVzdC51cmwpO1xuICAgIGNvbnN0IGlkID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2lkJyk7XG4gICAgXG4gICAgaWYgKCFpZCkge1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6ICdUcmFuc2FrdGlvbnMtSUQgZXJmb3JkZXJsaWNoLicgfSwgeyBzdGF0dXM6IDQwMCB9KTtcbiAgICB9XG4gICAgXG4gICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5mcm9tKCdGaW5hbnplbicpLmRlbGV0ZSgpLm1hdGNoKHsgaWQgfSk7XG4gICAgXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdERUxFVEUgL2FwaS9maW5hbnplbiBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9LCB7IHN0YXR1czogNTAwIH0pO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBtZXNzYWdlOiAnVHJhbnNha3Rpb24gZ2Vsw7ZzY2h0JyB9LCB7IHN0YXR1czogMjAwIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcignU2VydmVyIGVycm9yIERFTEVURSAvYXBpL2ZpbmFuemVuOicsIGUpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnU2VydmVyZmVobGVyIGJlaW0gTMO2c2NoZW4gZGVyIFRyYW5zYWt0aW9uLicgfSwgeyBzdGF0dXM6IDUwMCB9KTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbImNyZWF0ZUNsaWVudCIsIk5leHRSZXNwb25zZSIsIkdFVCIsInN1cGFiYXNlIiwiZGF0YSIsImVycm9yIiwiZnJvbSIsInNlbGVjdCIsIm9yZGVyIiwiYXNjZW5kaW5nIiwiY29uc29sZSIsImpzb24iLCJtZXNzYWdlIiwic3RhdHVzIiwiZSIsIlBPU1QiLCJyZXF1ZXN0IiwibG9nIiwicmVzdWx0IiwiaW5zZXJ0IiwiY29kZSIsImRldGFpbHMiLCJQVVQiLCJ1cmwiLCJVUkwiLCJpZCIsInNlYXJjaFBhcmFtcyIsImdldCIsInVwZGF0ZSIsIm1hdGNoIiwibGVuZ3RoIiwiREVMRVRFIiwiZGVsZXRlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/finanzen/route.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ffinanzen%2Froute&page=%2Fapi%2Ffinanzen%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffinanzen%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ffinanzen%2Froute&page=%2Fapi%2Ffinanzen%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffinanzen%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_felixplant_Downloads_Felix_GitHub_Repo_RMS_app_api_finanzen_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/finanzen/route.ts */ \"(rsc)/./app/api/finanzen/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/finanzen/route\",\n        pathname: \"/api/finanzen\",\n        filename: \"route\",\n        bundlePath: \"app/api/finanzen/route\"\n    },\n    resolvedPagePath: \"/Users/felixplant/Downloads/Felix/GitHub-Repo/RMS/app/api/finanzen/route.ts\",\n    nextConfigOutput,\n    userland: _Users_felixplant_Downloads_Felix_GitHub_Repo_RMS_app_api_finanzen_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZmaW5hbnplbiUyRnJvdXRlJnBhZ2U9JTJGYXBpJTJGZmluYW56ZW4lMkZyb3V0ZSZhcHBQYXRocz0mcGFnZVBhdGg9cHJpdmF0ZS1uZXh0LWFwcC1kaXIlMkZhcGklMkZmaW5hbnplbiUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmZlbGl4cGxhbnQlMkZEb3dubG9hZHMlMkZGZWxpeCUyRkdpdEh1Yi1SZXBvJTJGUk1TJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRmZlbGl4cGxhbnQlMkZEb3dubG9hZHMlMkZGZWxpeCUyRkdpdEh1Yi1SZXBvJTJGUk1TJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUErRjtBQUN2QztBQUNxQjtBQUMyQjtBQUN4RztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy9hcHAvYXBpL2ZpbmFuemVuL3JvdXRlLnRzXCI7XG4vLyBXZSBpbmplY3QgdGhlIG5leHRDb25maWdPdXRwdXQgaGVyZSBzbyB0aGF0IHdlIGNhbiB1c2UgdGhlbSBpbiB0aGUgcm91dGVcbi8vIG1vZHVsZS5cbmNvbnN0IG5leHRDb25maWdPdXRwdXQgPSBcIlwiXG5jb25zdCByb3V0ZU1vZHVsZSA9IG5ldyBBcHBSb3V0ZVJvdXRlTW9kdWxlKHtcbiAgICBkZWZpbml0aW9uOiB7XG4gICAgICAgIGtpbmQ6IFJvdXRlS2luZC5BUFBfUk9VVEUsXG4gICAgICAgIHBhZ2U6IFwiL2FwaS9maW5hbnplbi9yb3V0ZVwiLFxuICAgICAgICBwYXRobmFtZTogXCIvYXBpL2ZpbmFuemVuXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9maW5hbnplbi9yb3V0ZVwiXG4gICAgfSxcbiAgICByZXNvbHZlZFBhZ2VQYXRoOiBcIi9Vc2Vycy9mZWxpeHBsYW50L0Rvd25sb2Fkcy9GZWxpeC9HaXRIdWItUmVwby9STVMvYXBwL2FwaS9maW5hbnplbi9yb3V0ZS50c1wiLFxuICAgIG5leHRDb25maWdPdXRwdXQsXG4gICAgdXNlcmxhbmRcbn0pO1xuLy8gUHVsbCBvdXQgdGhlIGV4cG9ydHMgdGhhdCB3ZSBuZWVkIHRvIGV4cG9zZSBmcm9tIHRoZSBtb2R1bGUuIFRoaXMgc2hvdWxkXG4vLyBiZSBlbGltaW5hdGVkIHdoZW4gd2UndmUgbW92ZWQgdGhlIG90aGVyIHJvdXRlcyB0byB0aGUgbmV3IGZvcm1hdC4gVGhlc2Vcbi8vIGFyZSB1c2VkIHRvIGhvb2sgaW50byB0aGUgcm91dGUuXG5jb25zdCB7IHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcyB9ID0gcm91dGVNb2R1bGU7XG5mdW5jdGlvbiBwYXRjaEZldGNoKCkge1xuICAgIHJldHVybiBfcGF0Y2hGZXRjaCh7XG4gICAgICAgIHdvcmtBc3luY1N0b3JhZ2UsXG4gICAgICAgIHdvcmtVbml0QXN5bmNTdG9yYWdlXG4gICAgfSk7XG59XG5leHBvcnQgeyByb3V0ZU1vZHVsZSwgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzLCBwYXRjaEZldGNoLCAgfTtcblxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9YXBwLXJvdXRlLmpzLm1hcCJdLCJuYW1lcyI6W10sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ffinanzen%2Froute&page=%2Fapi%2Ffinanzen%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffinanzen%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

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
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/cookie","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ffinanzen%2Froute&page=%2Fapi%2Ffinanzen%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffinanzen%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();