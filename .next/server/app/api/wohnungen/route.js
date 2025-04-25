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
exports.id = "app/api/wohnungen/route";
exports.ids = ["app/api/wohnungen/route"];
exports.modules = {

/***/ "(rsc)/./app/api/wohnungen/route.ts":
/*!************************************!*\
  !*** ./app/api/wohnungen/route.ts ***!
  \************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   DELETE: () => (/* binding */ DELETE),\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   POST: () => (/* binding */ POST),\n/* harmony export */   PUT: () => (/* binding */ PUT)\n/* harmony export */ });\n/* harmony import */ var _utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/utils/supabase/server */ \"(rsc)/./utils/supabase/server.ts\");\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n\n\nasync function POST(request) {\n    try {\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const { name, groesse, miete, haus_id } = await request.json();\n        if (!name || groesse == null || miete == null) {\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: \"Name, Größe und Miete sind erforderlich.\"\n            }, {\n                status: 400\n            });\n        }\n        const { data, error } = await supabase.from('Wohnungen').insert({\n            name,\n            groesse,\n            miete,\n            haus_id\n        }).select();\n        if (error) {\n            console.error(\"Supabase Insert Error (Wohnungen):\", error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message\n            }, {\n                status: 500\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(data[0], {\n            status: 201\n        });\n    } catch (e) {\n        console.error(\"POST /api/wohnungen error:\", e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: \"Serverfehler beim Speichern der Wohnung.\"\n        }, {\n            status: 500\n        });\n    }\n}\nasync function GET() {\n    const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n    // join Haeuser to get haus name\n    const { data, error } = await supabase.from('Wohnungen').select('id, name, groesse, miete, haus_id, Haeuser(name)');\n    if (error) {\n        console.error(\"Supabase Select Error (Wohnungen):\", error);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: error.message\n        }, {\n            status: 500\n        });\n    }\n    return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(data, {\n        status: 200\n    });\n}\nasync function DELETE(request) {\n    try {\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const { searchParams } = new URL(request.url);\n        const id = searchParams.get(\"id\");\n        if (!id) {\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: \"Wohnungs-ID ist erforderlich.\"\n            }, {\n                status: 400\n            });\n        }\n        const { error } = await supabase.from('Wohnungen').delete().match({\n            id\n        });\n        if (error) {\n            console.error(\"Supabase Delete Error (Wohnungen):\", error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message\n            }, {\n                status: 500\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            message: \"Wohnung erfolgreich gelöscht.\"\n        }, {\n            status: 200\n        });\n    } catch (e) {\n        console.error(\"DELETE /api/wohnungen error:\", e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: \"Serverfehler beim Löschen der Wohnung.\"\n        }, {\n            status: 500\n        });\n    }\n}\nasync function PUT(request) {\n    try {\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const { searchParams } = new URL(request.url);\n        const id = searchParams.get(\"id\");\n        const { name, groesse, miete, haus_id } = await request.json();\n        if (!id) {\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: \"Wohnungs-ID ist erforderlich.\"\n            }, {\n                status: 400\n            });\n        }\n        if (!name || groesse == null || miete == null) {\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: \"Name, Größe und Miete sind erforderlich.\"\n            }, {\n                status: 400\n            });\n        }\n        const { data, error } = await supabase.from('Wohnungen').update({\n            name,\n            groesse,\n            miete,\n            haus_id\n        }).match({\n            id\n        }).select();\n        if (error) {\n            console.error(\"Supabase Update Error (Wohnungen):\", error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message\n            }, {\n                status: 500\n            });\n        }\n        if (!data || data.length === 0) {\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: \"Wohnung nicht gefunden oder Update fehlgeschlagen.\"\n            }, {\n                status: 404\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(data[0], {\n            status: 200\n        });\n    } catch (e) {\n        console.error(\"PUT /api/wohnungen error:\", e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: \"Serverfehler beim Aktualisieren der Wohnung.\"\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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QUVDLE9BQU87WUFBcUQsR0FBRztnQkFBRUMsUUFBUTtZQUFJO1FBQzFHO1FBQ0EsT0FBT1YscURBQVlBLENBQUNRLElBQUksQ0FBQ0csSUFBSSxDQUFDLEVBQUUsRUFBRTtZQUFFRCxRQUFRO1FBQUk7SUFDbEQsRUFBRSxPQUFPTyxHQUFHO1FBQ1ZGLFFBQVFOLEtBQUssQ0FBQyw2QkFBNkJRO1FBQzNDLE9BQU9qQixxREFBWUEsQ0FBQ1EsSUFBSSxDQUFDO1lBQUVDLE9BQU87UUFBK0MsR0FBRztZQUFFQyxRQUFRO1FBQUk7SUFDcEc7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy9hcHAvYXBpL3dvaG51bmdlbi9yb3V0ZS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tIFwiQC91dGlscy9zdXBhYmFzZS9zZXJ2ZXJcIjtcbmltcG9ydCB7IE5leHRSZXNwb25zZSB9IGZyb20gXCJuZXh0L3NlcnZlclwiO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gUE9TVChyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgICBjb25zdCB7IG5hbWUsIGdyb2Vzc2UsIG1pZXRlLCBoYXVzX2lkIH0gPSBhd2FpdCByZXF1ZXN0Lmpzb24oKTtcbiAgICBpZiAoIW5hbWUgfHwgZ3JvZXNzZSA9PSBudWxsIHx8IG1pZXRlID09IG51bGwpIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBcIk5hbWUsIEdyw7bDn2UgdW5kIE1pZXRlIHNpbmQgZXJmb3JkZXJsaWNoLlwiIH0sIHsgc3RhdHVzOiA0MDAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnV29obnVuZ2VuJylcbiAgICAgIC5pbnNlcnQoeyBuYW1lLCBncm9lc3NlLCBtaWV0ZSwgaGF1c19pZCB9KVxuICAgICAgLnNlbGVjdCgpO1xuICAgIGlmIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihcIlN1cGFiYXNlIEluc2VydCBFcnJvciAoV29obnVuZ2VuKTpcIiwgZXJyb3IpO1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSwgeyBzdGF0dXM6IDUwMCB9KTtcbiAgICB9XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKGRhdGFbMF0sIHsgc3RhdHVzOiAyMDEgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiUE9TVCAvYXBpL3dvaG51bmdlbiBlcnJvcjpcIiwgZSk7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IFwiU2VydmVyZmVobGVyIGJlaW0gU3BlaWNoZXJuIGRlciBXb2hudW5nLlwiIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIEdFVCgpIHtcbiAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgLy8gam9pbiBIYWV1c2VyIHRvIGdldCBoYXVzIG5hbWVcbiAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAuZnJvbSgnV29obnVuZ2VuJylcbiAgICAuc2VsZWN0KCdpZCwgbmFtZSwgZ3JvZXNzZSwgbWlldGUsIGhhdXNfaWQsIEhhZXVzZXIobmFtZSknKTtcbiAgaWYgKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihcIlN1cGFiYXNlIFNlbGVjdCBFcnJvciAoV29obnVuZ2VuKTpcIiwgZXJyb3IpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gIH1cbiAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKGRhdGEsIHsgc3RhdHVzOiAyMDAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBERUxFVEUocmVxdWVzdDogUmVxdWVzdCkge1xuICB0cnkge1xuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBzZWFyY2hQYXJhbXMgfSA9IG5ldyBVUkwocmVxdWVzdC51cmwpO1xuICAgIGNvbnN0IGlkID0gc2VhcmNoUGFyYW1zLmdldChcImlkXCIpO1xuICAgIGlmICghaWQpIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBcIldvaG51bmdzLUlEIGlzdCBlcmZvcmRlcmxpY2guXCIgfSwgeyBzdGF0dXM6IDQwMCB9KTtcbiAgICB9XG4gICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2UuZnJvbSgnV29obnVuZ2VuJykuZGVsZXRlKCkubWF0Y2goeyBpZCB9KTtcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJTdXBhYmFzZSBEZWxldGUgRXJyb3IgKFdvaG51bmdlbik6XCIsIGVycm9yKTtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gICAgfVxuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IG1lc3NhZ2U6IFwiV29obnVuZyBlcmZvbGdyZWljaCBnZWzDtnNjaHQuXCIgfSwgeyBzdGF0dXM6IDIwMCB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJERUxFVEUgL2FwaS93b2hudW5nZW4gZXJyb3I6XCIsIGUpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBcIlNlcnZlcmZlaGxlciBiZWltIEzDtnNjaGVuIGRlciBXb2hudW5nLlwiIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBVVChyZXF1ZXN0OiBSZXF1ZXN0KSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgc3VwYWJhc2UgPSBhd2FpdCBjcmVhdGVDbGllbnQoKTtcbiAgICBjb25zdCB7IHNlYXJjaFBhcmFtcyB9ID0gbmV3IFVSTChyZXF1ZXN0LnVybCk7XG4gICAgY29uc3QgaWQgPSBzZWFyY2hQYXJhbXMuZ2V0KFwiaWRcIik7XG4gICAgY29uc3QgeyBuYW1lLCBncm9lc3NlLCBtaWV0ZSwgaGF1c19pZCB9ID0gYXdhaXQgcmVxdWVzdC5qc29uKCk7XG4gICAgaWYgKCFpZCkge1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IFwiV29obnVuZ3MtSUQgaXN0IGVyZm9yZGVybGljaC5cIiB9LCB7IHN0YXR1czogNDAwIH0pO1xuICAgIH1cbiAgICBpZiAoIW5hbWUgfHwgZ3JvZXNzZSA9PSBudWxsIHx8IG1pZXRlID09IG51bGwpIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBcIk5hbWUsIEdyw7bDn2UgdW5kIE1pZXRlIHNpbmQgZXJmb3JkZXJsaWNoLlwiIH0sIHsgc3RhdHVzOiA0MDAgfSk7XG4gICAgfVxuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnV29obnVuZ2VuJylcbiAgICAgIC51cGRhdGUoeyBuYW1lLCBncm9lc3NlLCBtaWV0ZSwgaGF1c19pZCB9KVxuICAgICAgLm1hdGNoKHsgaWQgfSlcbiAgICAgIC5zZWxlY3QoKTtcbiAgICBpZiAoZXJyb3IpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoXCJTdXBhYmFzZSBVcGRhdGUgRXJyb3IgKFdvaG51bmdlbik6XCIsIGVycm9yKTtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gICAgfVxuICAgIGlmICghZGF0YSB8fCBkYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IFwiV29obnVuZyBuaWNodCBnZWZ1bmRlbiBvZGVyIFVwZGF0ZSBmZWhsZ2VzY2hsYWdlbi5cIiB9LCB7IHN0YXR1czogNDA0IH0pO1xuICAgIH1cbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oZGF0YVswXSwgeyBzdGF0dXM6IDIwMCB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJQVVQgL2FwaS93b2hudW5nZW4gZXJyb3I6XCIsIGUpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBcIlNlcnZlcmZlaGxlciBiZWltIEFrdHVhbGlzaWVyZW4gZGVyIFdvaG51bmcuXCIgfSwgeyBzdGF0dXM6IDUwMCB9KTtcbiAgfVxufVxuIl0sIm5hbWVzIjpbImNyZWF0ZUNsaWVudCIsIk5leHRSZXNwb25zZSIsIlBPU1QiLCJyZXF1ZXN0Iiwic3VwYWJhc2UiLCJuYW1lIiwiZ3JvZXNzZSIsIm1pZXRlIiwiaGF1c19pZCIsImpzb24iLCJlcnJvciIsInN0YXR1cyIsImRhdGEiLCJmcm9tIiwiaW5zZXJ0Iiwic2VsZWN0IiwiY29uc29sZSIsIm1lc3NhZ2UiLCJlIiwiR0VUIiwiREVMRVRFIiwic2VhcmNoUGFyYW1zIiwiVVJMIiwidXJsIiwiaWQiLCJnZXQiLCJkZWxldGUiLCJtYXRjaCIsIlBVVCIsInVwZGF0ZSIsImxlbmd0aCJdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./app/api/wohnungen/route.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fwohnungen%2Froute&page=%2Fapi%2Fwohnungen%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fwohnungen%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fwohnungen%2Froute&page=%2Fapi%2Fwohnungen%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fwohnungen%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \***************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_felixplant_Downloads_Felix_GitHub_Repo_RMS_app_api_wohnungen_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/wohnungen/route.ts */ \"(rsc)/./app/api/wohnungen/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/wohnungen/route\",\n        pathname: \"/api/wohnungen\",\n        filename: \"route\",\n        bundlePath: \"app/api/wohnungen/route\"\n    },\n    resolvedPagePath: \"/Users/felixplant/Downloads/Felix/GitHub-Repo/RMS/app/api/wohnungen/route.ts\",\n    nextConfigOutput,\n    userland: _Users_felixplant_Downloads_Felix_GitHub_Repo_RMS_app_api_wohnungen_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZ3b2hudW5nZW4lMkZyb3V0ZSZwYWdlPSUyRmFwaSUyRndvaG51bmdlbiUyRnJvdXRlJmFwcFBhdGhzPSZwYWdlUGF0aD1wcml2YXRlLW5leHQtYXBwLWRpciUyRmFwaSUyRndvaG51bmdlbiUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmZlbGl4cGxhbnQlMkZEb3dubG9hZHMlMkZGZWxpeCUyRkdpdEh1Yi1SZXBvJTJGUk1TJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRmZlbGl4cGxhbnQlMkZEb3dubG9hZHMlMkZGZWxpeCUyRkdpdEh1Yi1SZXBvJTJGUk1TJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUErRjtBQUN2QztBQUNxQjtBQUM0QjtBQUN6RztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy9hcHAvYXBpL3dvaG51bmdlbi9yb3V0ZS50c1wiO1xuLy8gV2UgaW5qZWN0IHRoZSBuZXh0Q29uZmlnT3V0cHV0IGhlcmUgc28gdGhhdCB3ZSBjYW4gdXNlIHRoZW0gaW4gdGhlIHJvdXRlXG4vLyBtb2R1bGUuXG5jb25zdCBuZXh0Q29uZmlnT3V0cHV0ID0gXCJcIlxuY29uc3Qgcm91dGVNb2R1bGUgPSBuZXcgQXBwUm91dGVSb3V0ZU1vZHVsZSh7XG4gICAgZGVmaW5pdGlvbjoge1xuICAgICAgICBraW5kOiBSb3V0ZUtpbmQuQVBQX1JPVVRFLFxuICAgICAgICBwYWdlOiBcIi9hcGkvd29obnVuZ2VuL3JvdXRlXCIsXG4gICAgICAgIHBhdGhuYW1lOiBcIi9hcGkvd29obnVuZ2VuXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS93b2hudW5nZW4vcm91dGVcIlxuICAgIH0sXG4gICAgcmVzb2x2ZWRQYWdlUGF0aDogXCIvVXNlcnMvZmVsaXhwbGFudC9Eb3dubG9hZHMvRmVsaXgvR2l0SHViLVJlcG8vUk1TL2FwcC9hcGkvd29obnVuZ2VuL3JvdXRlLnRzXCIsXG4gICAgbmV4dENvbmZpZ091dHB1dCxcbiAgICB1c2VybGFuZFxufSk7XG4vLyBQdWxsIG91dCB0aGUgZXhwb3J0cyB0aGF0IHdlIG5lZWQgdG8gZXhwb3NlIGZyb20gdGhlIG1vZHVsZS4gVGhpcyBzaG91bGRcbi8vIGJlIGVsaW1pbmF0ZWQgd2hlbiB3ZSd2ZSBtb3ZlZCB0aGUgb3RoZXIgcm91dGVzIHRvIHRoZSBuZXcgZm9ybWF0LiBUaGVzZVxuLy8gYXJlIHVzZWQgdG8gaG9vayBpbnRvIHRoZSByb3V0ZS5cbmNvbnN0IHsgd29ya0FzeW5jU3RvcmFnZSwgd29ya1VuaXRBc3luY1N0b3JhZ2UsIHNlcnZlckhvb2tzIH0gPSByb3V0ZU1vZHVsZTtcbmZ1bmN0aW9uIHBhdGNoRmV0Y2goKSB7XG4gICAgcmV0dXJuIF9wYXRjaEZldGNoKHtcbiAgICAgICAgd29ya0FzeW5jU3RvcmFnZSxcbiAgICAgICAgd29ya1VuaXRBc3luY1N0b3JhZ2VcbiAgICB9KTtcbn1cbmV4cG9ydCB7IHJvdXRlTW9kdWxlLCB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MsIHBhdGNoRmV0Y2gsICB9O1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1hcHAtcm91dGUuanMubWFwIl0sIm5hbWVzIjpbXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fwohnungen%2Froute&page=%2Fapi%2Fwohnungen%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fwohnungen%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

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
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/cookie","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Fwohnungen%2Froute&page=%2Fapi%2Fwohnungen%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Fwohnungen%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();