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
exports.id = "app/api/mieter/route";
exports.ids = ["app/api/mieter/route"];
exports.modules = {

/***/ "(rsc)/./app/api/mieter/route.ts":
/*!*********************************!*\
  !*** ./app/api/mieter/route.ts ***!
  \*********************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   DELETE: () => (/* binding */ DELETE),\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   POST: () => (/* binding */ POST),\n/* harmony export */   PUT: () => (/* binding */ PUT)\n/* harmony export */ });\n/* harmony import */ var _utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/utils/supabase/server */ \"(rsc)/./utils/supabase/server.ts\");\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n\n\nasync function GET() {\n    try {\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const { data, error } = await supabase.from('Mieter').select('*');\n        if (error) {\n            console.error('GET /api/mieter error:', error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message\n            }, {\n                status: 500\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(data, {\n            status: 200\n        });\n    } catch (e) {\n        console.error('Server error GET /api/mieter:', e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Serverfehler bei Mieter-Abfrage.'\n        }, {\n            status: 500\n        });\n    }\n}\nasync function POST(request) {\n    try {\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const m = await request.json();\n        console.error('POST /api/mieter payload:', m);\n        const { data, error } = await supabase.from('Mieter').insert(m).select();\n        if (error) {\n            console.error('POST /api/mieter error:', error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message,\n                code: error.code,\n                details: error.details\n            }, {\n                status: 400\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(data[0], {\n            status: 201\n        });\n    } catch (e) {\n        console.error('Server error POST /api/mieter:', e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Serverfehler beim Erstellen des Mieters.'\n        }, {\n            status: 500\n        });\n    }\n}\nasync function PUT(request) {\n    try {\n        const url = new URL(request.url);\n        const id = url.searchParams.get('id');\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const m = await request.json();\n        const { data, error } = await supabase.from('Mieter').update(m).match({\n            id\n        }).select();\n        if (error) {\n            console.error('PUT /api/mieter error:', error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message\n            }, {\n                status: 500\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(data[0], {\n            status: 200\n        });\n    } catch (e) {\n        console.error('Server error PUT /api/mieter:', e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Serverfehler beim Aktualisieren des Mieters.'\n        }, {\n            status: 500\n        });\n    }\n}\nasync function DELETE(request) {\n    try {\n        const url = new URL(request.url);\n        const id = url.searchParams.get('id');\n        if (!id) return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Mieter-ID erforderlich.'\n        }, {\n            status: 400\n        });\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const { error } = await supabase.from('Mieter').delete().match({\n            id\n        });\n        if (error) {\n            console.error('DELETE /api/mieter error:', error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message\n            }, {\n                status: 500\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            message: 'Mieter gelöscht'\n        }, {\n            status: 200\n        });\n    } catch (e) {\n        console.error('Server error DELETE /api/mieter:', e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Serverfehler beim Löschen des Mieters.'\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUFJO0lBQ3BHO0FBQ0Y7QUFFTyxlQUFlZ0IsT0FBT2IsT0FBZ0I7SUFDM0MsSUFBSTtRQUNGLE1BQU1NLE1BQU0sSUFBSUMsSUFBSVAsUUFBUU0sR0FBRztRQUMvQixNQUFNRSxLQUFLRixJQUFJRyxZQUFZLENBQUNDLEdBQUcsQ0FBQztRQUNoQyxJQUFJLENBQUNGLElBQUksT0FBT3JCLHFEQUFZQSxDQUFDUSxJQUFJLENBQUM7WUFBRUosT0FBTztRQUEwQixHQUFHO1lBQUVNLFFBQVE7UUFBSTtRQUN0RixNQUFNUixXQUFXLE1BQU1ILG9FQUFZQTtRQUNuQyxNQUFNLEVBQUVLLEtBQUssRUFBRSxHQUFHLE1BQU1GLFNBQVNHLElBQUksQ0FBQyxVQUFVc0IsTUFBTSxHQUFHRixLQUFLLENBQUM7WUFBRUo7UUFBRztRQUNwRSxJQUFJakIsT0FBTztZQUNURyxRQUFRSCxLQUFLLENBQUMsNkJBQTZCQTtZQUMzQyxPQUFPSixxREFBWUEsQ0FBQ1EsSUFBSSxDQUFDO2dCQUFFSixPQUFPQSxNQUFNSyxPQUFPO1lBQUMsR0FBRztnQkFBRUMsUUFBUTtZQUFJO1FBQ25FO1FBQ0EsT0FBT1YscURBQVlBLENBQUNRLElBQUksQ0FBQztZQUFFQyxTQUFTO1FBQWtCLEdBQUc7WUFBRUMsUUFBUTtRQUFJO0lBQ3pFLEVBQUUsT0FBT0MsR0FBRztRQUNWSixRQUFRSCxLQUFLLENBQUMsb0NBQW9DTztRQUNsRCxPQUFPWCxxREFBWUEsQ0FBQ1EsSUFBSSxDQUFDO1lBQUVKLE9BQU87UUFBeUMsR0FBRztZQUFFTSxRQUFRO1FBQUk7SUFDOUY7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy9hcHAvYXBpL21pZXRlci9yb3V0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tIFwiQC91dGlscy9zdXBhYmFzZS9zZXJ2ZXJcIjtcbmltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gXCJuZXh0L3NlcnZlclwiO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gR0VUKCkge1xuICB0cnkge1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuZnJvbSgnTWlldGVyJykuc2VsZWN0KCcqJyk7XG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdHRVQgL2FwaS9taWV0ZXIgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSwgeyBzdGF0dXM6IDUwMCB9KTtcbiAgICB9XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKGRhdGEsIHsgc3RhdHVzOiAyMDAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKCdTZXJ2ZXIgZXJyb3IgR0VUIC9hcGkvbWlldGVyOicsIGUpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnU2VydmVyZmVobGVyIGJlaSBNaWV0ZXItQWJmcmFnZS4nIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBPU1QocmVxdWVzdDogUmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgbSA9IGF3YWl0IHJlcXVlc3QuanNvbigpO1xuICAgIGNvbnNvbGUuZXJyb3IoJ1BPU1QgL2FwaS9taWV0ZXIgcGF5bG9hZDonLCBtKTtcbiAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5mcm9tKCdNaWV0ZXInKS5pbnNlcnQobSkuc2VsZWN0KCk7XG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdQT1NUIC9hcGkvbWlldGVyIGVycm9yOicsIGVycm9yKTtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBlcnJvci5tZXNzYWdlLCBjb2RlOiBlcnJvci5jb2RlLCBkZXRhaWxzOiBlcnJvci5kZXRhaWxzIH0sIHsgc3RhdHVzOiA0MDAgfSk7XG4gICAgfVxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbihkYXRhWzBdLCB7IHN0YXR1czogMjAxIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcignU2VydmVyIGVycm9yIFBPU1QgL2FwaS9taWV0ZXI6JywgZSk7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6ICdTZXJ2ZXJmZWhsZXIgYmVpbSBFcnN0ZWxsZW4gZGVzIE1pZXRlcnMuJyB9LCB7IHN0YXR1czogNTAwIH0pO1xuICB9XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQVVQocmVxdWVzdDogUmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IHVybCA9IG5ldyBVUkwocmVxdWVzdC51cmwpO1xuICAgIGNvbnN0IGlkID0gdXJsLnNlYXJjaFBhcmFtcy5nZXQoJ2lkJyk7XG4gICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgICBjb25zdCBtID0gYXdhaXQgcmVxdWVzdC5qc29uKCk7XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuZnJvbSgnTWlldGVyJykudXBkYXRlKG0pLm1hdGNoKHsgaWQgfSkuc2VsZWN0KCk7XG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdQVVQgL2FwaS9taWV0ZXIgZXJyb3I6JywgZXJyb3IpO1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSwgeyBzdGF0dXM6IDUwMCB9KTtcbiAgICB9XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKGRhdGFbMF0sIHsgc3RhdHVzOiAyMDAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKCdTZXJ2ZXIgZXJyb3IgUFVUIC9hcGkvbWlldGVyOicsIGUpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnU2VydmVyZmVobGVyIGJlaW0gQWt0dWFsaXNpZXJlbiBkZXMgTWlldGVycy4nIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIERFTEVURShyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gIHRyeSB7XG4gICAgY29uc3QgdXJsID0gbmV3IFVSTChyZXF1ZXN0LnVybCk7XG4gICAgY29uc3QgaWQgPSB1cmwuc2VhcmNoUGFyYW1zLmdldCgnaWQnKTtcbiAgICBpZiAoIWlkKSByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogJ01pZXRlci1JRCBlcmZvcmRlcmxpY2guJyB9LCB7IHN0YXR1czogNDAwIH0pO1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuZnJvbSgnTWlldGVyJykuZGVsZXRlKCkubWF0Y2goeyBpZCB9KTtcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0RFTEVURSAvYXBpL21pZXRlciBlcnJvcjonLCBlcnJvcik7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9LCB7IHN0YXR1czogNTAwIH0pO1xuICAgIH1cbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBtZXNzYWdlOiAnTWlldGVyIGdlbMO2c2NodCcgfSwgeyBzdGF0dXM6IDIwMCB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1NlcnZlciBlcnJvciBERUxFVEUgL2FwaS9taWV0ZXI6JywgZSk7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6ICdTZXJ2ZXJmZWhsZXIgYmVpbSBMw7ZzY2hlbiBkZXMgTWlldGVycy4nIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gIH1cbn1cbiJdLCJuYW1lcyI6WyJjcmVhdGVDbGllbnQiLCJOZXh0UmVzcG9uc2UiLCJHRVQiLCJzdXBhYmFzZSIsImRhdGEiLCJlcnJvciIsImZyb20iLCJzZWxlY3QiLCJjb25zb2xlIiwianNvbiIsIm1lc3NhZ2UiLCJzdGF0dXMiLCJlIiwiUE9TVCIsInJlcXVlc3QiLCJtIiwiaW5zZXJ0IiwiY29kZSIsImRldGFpbHMiLCJQVVQiLCJ1cmwiLCJVUkwiLCJpZCIsInNlYXJjaFBhcmFtcyIsImdldCIsInVwZGF0ZSIsIm1hdGNoIiwiREVMRVRFIiwiZGVsZXRlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./app/api/mieter/route.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fmieter%2Froute&page=%2Fapi%2Fmieter%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fmieter%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fmieter%2Froute&page=%2Fapi%2Fmieter%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fmieter%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \******************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_felixplant_Downloads_Felix_GitHub_Repo_RMS_app_api_mieter_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/mieter/route.ts */ \"(rsc)/./app/api/mieter/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/mieter/route\",\n        pathname: \"/api/mieter\",\n        filename: \"route\",\n        bundlePath: \"app/api/mieter/route\"\n    },\n    resolvedPagePath: \"/Users/felixplant/Downloads/Felix/GitHub-Repo/RMS/app/api/mieter/route.ts\",\n    nextConfigOutput,\n    userland: _Users_felixplant_Downloads_Felix_GitHub_Repo_RMS_app_api_mieter_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZtaWV0ZXIlMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRm1pZXRlciUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRm1pZXRlciUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmZlbGl4cGxhbnQlMkZEb3dubG9hZHMlMkZGZWxpeCUyRkdpdEh1Yi1SZXBvJTJGUk1TJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRmZlbGl4cGxhbnQlMkZEb3dubG9hZHMlMkZGZWxpeCUyRkdpdEh1Yi1SZXBvJTJGUk1TJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUErRjtBQUN2QztBQUNxQjtBQUN5QjtBQUN0RztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy9hcHAvYXBpL21pZXRlci9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvbWlldGVyL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvbWlldGVyXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9taWV0ZXIvcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvZmVsaXhwbGFudC9Eb3dubG9hZHMvRmVsaXgvR2l0SHViLVJlcG8vUk1TL2FwcC9hcGkvbWlldGVyL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fmieter%2Froute&page=%2Fapi%2Fmieter%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fmieter%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

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
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/cookie","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fmieter%2Froute&page=%2Fapi%2Fmieter%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fmieter%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();