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
exports.id = "app/api/finanzen/[id]/route";
exports.ids = ["app/api/finanzen/[id]/route"];
exports.modules = {

/***/ "(rsc)/./app/api/finanzen/[id]/route.ts":
/*!****************************************!*\
  !*** ./app/api/finanzen/[id]/route.ts ***!
  \****************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   DELETE: () => (/* binding */ DELETE),\n/* harmony export */   GET: () => (/* binding */ GET),\n/* harmony export */   PATCH: () => (/* binding */ PATCH),\n/* harmony export */   PUT: () => (/* binding */ PUT)\n/* harmony export */ });\n/* harmony import */ var _utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @/utils/supabase/server */ \"(rsc)/./utils/supabase/server.ts\");\n/* harmony import */ var next_server__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/server */ \"(rsc)/./node_modules/next/dist/api/server.js\");\n\n\n// GET spezifische Finanztransaktion by ID\nasync function GET(_request, { params }) {\n    try {\n        const { id } = params;\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const { data, error } = await supabase.from('Finanzen').select('*, Wohnungen(name)').eq('id', id).single();\n        if (error) {\n            console.error(`GET /api/finanzen/${id} error:`, error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message\n            }, {\n                status: 500\n            });\n        }\n        if (!data) {\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: 'Transaktion nicht gefunden.'\n            }, {\n                status: 404\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(data, {\n            status: 200\n        });\n    } catch (e) {\n        console.error('Server error GET /api/finanzen/[id]:', e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Serverfehler bei Finanzen-Abfrage.'\n        }, {\n            status: 500\n        });\n    }\n}\n// PATCH um Finanztransaktion zu aktualisieren, z.B. ist_einnahmen umschalten\nasync function PATCH(request, { params }) {\n    try {\n        const { id } = params;\n        const body = await request.json();\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        // Wenn wir nur ist_einnahmen umschalten möchten\n        if (body.hasOwnProperty('ist_einnahmen')) {\n            const { data, error } = await supabase.from('Finanzen').update({\n                ist_einnahmen: body.ist_einnahmen\n            }).eq('id', id).select();\n            if (error) {\n                console.error(`PATCH /api/finanzen/${id} error:`, error);\n                return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                    error: error.message\n                }, {\n                    status: 400\n                });\n            }\n            if (!data || data.length === 0) {\n                return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                    error: 'Transaktion nicht gefunden.'\n                }, {\n                    status: 404\n                });\n            }\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(data[0], {\n                status: 200\n            });\n        } else {\n            // Komplette Aktualisierung\n            const { data, error } = await supabase.from('Finanzen').update(body).eq('id', id).select();\n            if (error) {\n                console.error(`PATCH /api/finanzen/${id} error:`, error);\n                return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                    error: error.message\n                }, {\n                    status: 400\n                });\n            }\n            if (!data || data.length === 0) {\n                return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                    error: 'Transaktion nicht gefunden.'\n                }, {\n                    status: 404\n                });\n            }\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(data[0], {\n                status: 200\n            });\n        }\n    } catch (e) {\n        console.error('Server error PATCH /api/finanzen/[id]:', e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Serverfehler beim Aktualisieren der Transaktion.'\n        }, {\n            status: 500\n        });\n    }\n}\n// PUT um Finanztransaktion zu aktualisieren\nasync function PUT(request, { params }) {\n    try {\n        const { id } = params;\n        const body = await request.json();\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const { data, error } = await supabase.from('Finanzen').update(body).eq('id', id).select();\n        if (error) {\n            console.error(`PUT /api/finanzen/${id} error:`, error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message\n            }, {\n                status: 400\n            });\n        }\n        if (!data || data.length === 0) {\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: 'Transaktion nicht gefunden.'\n            }, {\n                status: 404\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json(data[0], {\n            status: 200\n        });\n    } catch (e) {\n        console.error('Server error PUT /api/finanzen/[id]:', e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Serverfehler beim Aktualisieren der Transaktion.'\n        }, {\n            status: 500\n        });\n    }\n}\n// DELETE um Finanztransaktion zu löschen\nasync function DELETE(_request, { params }) {\n    try {\n        const { id } = params;\n        const supabase = await (0,_utils_supabase_server__WEBPACK_IMPORTED_MODULE_0__.createClient)();\n        const { error } = await supabase.from('Finanzen').delete().eq('id', id);\n        if (error) {\n            console.error(`DELETE /api/finanzen/${id} error:`, error);\n            return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n                error: error.message\n            }, {\n                status: 500\n            });\n        }\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            message: 'Transaktion gelöscht'\n        }, {\n            status: 200\n        });\n    } catch (e) {\n        console.error('Server error DELETE /api/finanzen/[id]:', e);\n        return next_server__WEBPACK_IMPORTED_MODULE_1__.NextResponse.json({\n            error: 'Serverfehler beim Löschen der Transaktion.'\n        }, {\n            status: 500\n        });\n    }\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,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cy9mZWxpeHBsYW50L0Rvd25sb2Fkcy9GZWxpeC9HaXRIdWItUmVwby9STVMvYXBwL2FwaS9maW5hbnplbi9baWRdL3JvdXRlLnRzIl0sInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IGNyZWF0ZUNsaWVudCB9IGZyb20gXCJAL3V0aWxzL3N1cGFiYXNlL3NlcnZlclwiO1xuaW1wb3J0IHsgTmV4dFJlcXVlc3QsIE5leHRSZXNwb25zZSB9IGZyb20gXCJuZXh0L3NlcnZlclwiO1xuXG4vLyBHRVQgc3BlemlmaXNjaGUgRmluYW56dHJhbnNha3Rpb24gYnkgSURcbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBHRVQoXG4gIF9yZXF1ZXN0OiBOZXh0UmVxdWVzdCxcbiAgeyBwYXJhbXMgfTogeyBwYXJhbXM6IHsgaWQ6IHN0cmluZyB9IH1cbikge1xuICB0cnkge1xuICAgIGNvbnN0IHsgaWQgfSA9IHBhcmFtcztcbiAgICBcbiAgICBjb25zdCBzdXBhYmFzZSA9IGF3YWl0IGNyZWF0ZUNsaWVudCgpO1xuICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAuZnJvbSgnRmluYW56ZW4nKVxuICAgICAgLnNlbGVjdCgnKiwgV29obnVuZ2VuKG5hbWUpJylcbiAgICAgIC5lcSgnaWQnLCBpZClcbiAgICAgIC5zaW5nbGUoKTtcbiAgICAgIFxuICAgIGlmIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcihgR0VUIC9hcGkvZmluYW56ZW4vJHtpZH0gZXJyb3I6YCwgZXJyb3IpO1xuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSwgeyBzdGF0dXM6IDUwMCB9KTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFkYXRhKSB7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogJ1RyYW5zYWt0aW9uIG5pY2h0IGdlZnVuZGVuLicgfSwgeyBzdGF0dXM6IDQwNCB9KTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKGRhdGEsIHsgc3RhdHVzOiAyMDAgfSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICBjb25zb2xlLmVycm9yKCdTZXJ2ZXIgZXJyb3IgR0VUIC9hcGkvZmluYW56ZW4vW2lkXTonLCBlKTtcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogJ1NlcnZlcmZlaGxlciBiZWkgRmluYW56ZW4tQWJmcmFnZS4nIH0sIHsgc3RhdHVzOiA1MDAgfSk7XG4gIH1cbn1cblxuLy8gUEFUQ0ggdW0gRmluYW56dHJhbnNha3Rpb24genUgYWt0dWFsaXNpZXJlbiwgei5CLiBpc3RfZWlubmFobWVuIHVtc2NoYWx0ZW5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBQQVRDSChcbiAgcmVxdWVzdDogTmV4dFJlcXVlc3QsXG4gIHsgcGFyYW1zIH06IHsgcGFyYW1zOiB7IGlkOiBzdHJpbmcgfSB9XG4pIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGlkIH0gPSBwYXJhbXM7XG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHJlcXVlc3QuanNvbigpO1xuICAgIFxuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgXG4gICAgLy8gV2VubiB3aXIgbnVyIGlzdF9laW5uYWhtZW4gdW1zY2hhbHRlbiBtw7ZjaHRlblxuICAgIGlmIChib2R5Lmhhc093blByb3BlcnR5KCdpc3RfZWlubmFobWVuJykpIHtcbiAgICAgIGNvbnN0IHsgZGF0YSwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKCdGaW5hbnplbicpXG4gICAgICAgIC51cGRhdGUoeyBpc3RfZWlubmFobWVuOiBib2R5LmlzdF9laW5uYWhtZW4gfSlcbiAgICAgICAgLmVxKCdpZCcsIGlkKVxuICAgICAgICAuc2VsZWN0KCk7XG4gICAgICBcbiAgICAgIGlmIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBQQVRDSCAvYXBpL2ZpbmFuemVuLyR7aWR9IGVycm9yOmAsIGVycm9yKTtcbiAgICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6IGVycm9yLm1lc3NhZ2UgfSwgeyBzdGF0dXM6IDQwMCB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgaWYgKCFkYXRhIHx8IGRhdGEubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnVHJhbnNha3Rpb24gbmljaHQgZ2VmdW5kZW4uJyB9LCB7IHN0YXR1czogNDA0IH0pO1xuICAgICAgfVxuICAgICAgXG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oZGF0YVswXSwgeyBzdGF0dXM6IDIwMCB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gS29tcGxldHRlIEFrdHVhbGlzaWVydW5nXG4gICAgICBjb25zdCB7IGRhdGEsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgICAuZnJvbSgnRmluYW56ZW4nKVxuICAgICAgICAudXBkYXRlKGJvZHkpXG4gICAgICAgIC5lcSgnaWQnLCBpZClcbiAgICAgICAgLnNlbGVjdCgpO1xuICAgICAgXG4gICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgUEFUQ0ggL2FwaS9maW5hbnplbi8ke2lkfSBlcnJvcjpgLCBlcnJvcik7XG4gICAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiBlcnJvci5tZXNzYWdlIH0sIHsgc3RhdHVzOiA0MDAgfSk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIGlmICghZGF0YSB8fCBkYXRhLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogJ1RyYW5zYWt0aW9uIG5pY2h0IGdlZnVuZGVuLicgfSwgeyBzdGF0dXM6IDQwNCB9KTtcbiAgICAgIH1cbiAgICAgIFxuICAgICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKGRhdGFbMF0sIHsgc3RhdHVzOiAyMDAgfSk7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcignU2VydmVyIGVycm9yIFBBVENIIC9hcGkvZmluYW56ZW4vW2lkXTonLCBlKTtcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogJ1NlcnZlcmZlaGxlciBiZWltIEFrdHVhbGlzaWVyZW4gZGVyIFRyYW5zYWt0aW9uLicgfSwgeyBzdGF0dXM6IDUwMCB9KTtcbiAgfVxufVxuXG4vLyBQVVQgdW0gRmluYW56dHJhbnNha3Rpb24genUgYWt0dWFsaXNpZXJlblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIFBVVChcbiAgcmVxdWVzdDogTmV4dFJlcXVlc3QsXG4gIHsgcGFyYW1zIH06IHsgcGFyYW1zOiB7IGlkOiBzdHJpbmcgfSB9XG4pIHtcbiAgdHJ5IHtcbiAgICBjb25zdCB7IGlkIH0gPSBwYXJhbXM7XG4gICAgY29uc3QgYm9keSA9IGF3YWl0IHJlcXVlc3QuanNvbigpO1xuICAgIFxuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBkYXRhLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdGaW5hbnplbicpXG4gICAgICAudXBkYXRlKGJvZHkpXG4gICAgICAuZXEoJ2lkJywgaWQpXG4gICAgICAuc2VsZWN0KCk7XG4gICAgXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBQVVQgL2FwaS9maW5hbnplbi8ke2lkfSBlcnJvcjpgLCBlcnJvcik7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9LCB7IHN0YXR1czogNDAwIH0pO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIWRhdGEgfHwgZGF0YS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnVHJhbnNha3Rpb24gbmljaHQgZ2VmdW5kZW4uJyB9LCB7IHN0YXR1czogNDA0IH0pO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oZGF0YVswXSwgeyBzdGF0dXM6IDIwMCB9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1NlcnZlciBlcnJvciBQVVQgL2FwaS9maW5hbnplbi9baWRdOicsIGUpO1xuICAgIHJldHVybiBOZXh0UmVzcG9uc2UuanNvbih7IGVycm9yOiAnU2VydmVyZmVobGVyIGJlaW0gQWt0dWFsaXNpZXJlbiBkZXIgVHJhbnNha3Rpb24uJyB9LCB7IHN0YXR1czogNTAwIH0pO1xuICB9XG59XG5cbi8vIERFTEVURSB1bSBGaW5hbnp0cmFuc2FrdGlvbiB6dSBsw7ZzY2hlblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIERFTEVURShcbiAgX3JlcXVlc3Q6IE5leHRSZXF1ZXN0LFxuICB7IHBhcmFtcyB9OiB7IHBhcmFtczogeyBpZDogc3RyaW5nIH0gfVxuKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgeyBpZCB9ID0gcGFyYW1zO1xuICAgIFxuICAgIGNvbnN0IHN1cGFiYXNlID0gYXdhaXQgY3JlYXRlQ2xpZW50KCk7XG4gICAgY29uc3QgeyBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgIC5mcm9tKCdGaW5hbnplbicpXG4gICAgICAuZGVsZXRlKClcbiAgICAgIC5lcSgnaWQnLCBpZCk7XG4gICAgXG4gICAgaWYgKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGBERUxFVEUgL2FwaS9maW5hbnplbi8ke2lkfSBlcnJvcjpgLCBlcnJvcik7XG4gICAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBlcnJvcjogZXJyb3IubWVzc2FnZSB9LCB7IHN0YXR1czogNTAwIH0pO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gTmV4dFJlc3BvbnNlLmpzb24oeyBtZXNzYWdlOiAnVHJhbnNha3Rpb24gZ2Vsw7ZzY2h0JyB9LCB7IHN0YXR1czogMjAwIH0pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcignU2VydmVyIGVycm9yIERFTEVURSAvYXBpL2ZpbmFuemVuL1tpZF06JywgZSk7XG4gICAgcmV0dXJuIE5leHRSZXNwb25zZS5qc29uKHsgZXJyb3I6ICdTZXJ2ZXJmZWhsZXIgYmVpbSBMw7ZzY2hlbiBkZXIgVHJhbnNha3Rpb24uJyB9LCB7IHN0YXR1czogNTAwIH0pO1xuICB9XG59XG4iXSwibmFtZXMiOlsiY3JlYXRlQ2xpZW50IiwiTmV4dFJlc3BvbnNlIiwiR0VUIiwiX3JlcXVlc3QiLCJwYXJhbXMiLCJpZCIsInN1cGFiYXNlIiwiZGF0YSIsImVycm9yIiwiZnJvbSIsInNlbGVjdCIsImVxIiwic2luZ2xlIiwiY29uc29sZSIsImpzb24iLCJtZXNzYWdlIiwic3RhdHVzIiwiZSIsIlBBVENIIiwicmVxdWVzdCIsImJvZHkiLCJoYXNPd25Qcm9wZXJ0eSIsInVwZGF0ZSIsImlzdF9laW5uYWhtZW4iLCJsZW5ndGgiLCJQVVQiLCJERUxFVEUiLCJkZWxldGUiXSwiaWdub3JlTGlzdCI6W10sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///(rsc)/./app/api/finanzen/[id]/route.ts\n");

/***/ }),

/***/ "(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ffinanzen%2F%5Bid%5D%2Froute&page=%2Fapi%2Ffinanzen%2F%5Bid%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffinanzen%2F%5Bid%5D%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!":
/*!*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************!*\
  !*** ./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ffinanzen%2F%5Bid%5D%2Froute&page=%2Fapi%2Ffinanzen%2F%5Bid%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffinanzen%2F%5Bid%5D%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D! ***!
  \*********************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   patchFetch: () => (/* binding */ patchFetch),\n/* harmony export */   routeModule: () => (/* binding */ routeModule),\n/* harmony export */   serverHooks: () => (/* binding */ serverHooks),\n/* harmony export */   workAsyncStorage: () => (/* binding */ workAsyncStorage),\n/* harmony export */   workUnitAsyncStorage: () => (/* binding */ workUnitAsyncStorage)\n/* harmony export */ });\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! next/dist/server/route-modules/app-route/module.compiled */ \"(rsc)/./node_modules/next/dist/server/route-modules/app-route/module.compiled.js\");\n/* harmony import */ var next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__);\n/* harmony import */ var next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! next/dist/server/route-kind */ \"(rsc)/./node_modules/next/dist/server/route-kind.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! next/dist/server/lib/patch-fetch */ \"(rsc)/./node_modules/next/dist/server/lib/patch-fetch.js\");\n/* harmony import */ var next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2___default = /*#__PURE__*/__webpack_require__.n(next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__);\n/* harmony import */ var _Users_felixplant_Downloads_Felix_GitHub_Repo_RMS_app_api_finanzen_id_route_ts__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./app/api/finanzen/[id]/route.ts */ \"(rsc)/./app/api/finanzen/[id]/route.ts\");\n\n\n\n\n// We inject the nextConfigOutput here so that we can use them in the route\n// module.\nconst nextConfigOutput = \"\"\nconst routeModule = new next_dist_server_route_modules_app_route_module_compiled__WEBPACK_IMPORTED_MODULE_0__.AppRouteRouteModule({\n    definition: {\n        kind: next_dist_server_route_kind__WEBPACK_IMPORTED_MODULE_1__.RouteKind.APP_ROUTE,\n        page: \"/api/finanzen/[id]/route\",\n        pathname: \"/api/finanzen/[id]\",\n        filename: \"route\",\n        bundlePath: \"app/api/finanzen/[id]/route\"\n    },\n    resolvedPagePath: \"/Users/felixplant/Downloads/Felix/GitHub-Repo/RMS/app/api/finanzen/[id]/route.ts\",\n    nextConfigOutput,\n    userland: _Users_felixplant_Downloads_Felix_GitHub_Repo_RMS_app_api_finanzen_id_route_ts__WEBPACK_IMPORTED_MODULE_3__\n});\n// Pull out the exports that we need to expose from the module. This should\n// be eliminated when we've moved the other routes to the new format. These\n// are used to hook into the route.\nconst { workAsyncStorage, workUnitAsyncStorage, serverHooks } = routeModule;\nfunction patchFetch() {\n    return (0,next_dist_server_lib_patch_fetch__WEBPACK_IMPORTED_MODULE_2__.patchFetch)({\n        workAsyncStorage,\n        workUnitAsyncStorage\n    });\n}\n\n\n//# sourceMappingURL=app-route.js.map//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvbmV4dC9kaXN0L2J1aWxkL3dlYnBhY2svbG9hZGVycy9uZXh0LWFwcC1sb2FkZXIvaW5kZXguanM/bmFtZT1hcHAlMkZhcGklMkZmaW5hbnplbiUyRiU1QmlkJTVEJTJGcm91dGUmcGFnZT0lMkZhcGklMkZmaW5hbnplbiUyRiU1QmlkJTVEJTJGcm91dGUmYXBwUGF0aHM9JnBhZ2VQYXRoPXByaXZhdGUtbmV4dC1hcHAtZGlyJTJGYXBpJTJGZmluYW56ZW4lMkYlNUJpZCU1RCUyRnJvdXRlLnRzJmFwcERpcj0lMkZVc2VycyUyRmZlbGl4cGxhbnQlMkZEb3dubG9hZHMlMkZGZWxpeCUyRkdpdEh1Yi1SZXBvJTJGUk1TJTJGYXBwJnBhZ2VFeHRlbnNpb25zPXRzeCZwYWdlRXh0ZW5zaW9ucz10cyZwYWdlRXh0ZW5zaW9ucz1qc3gmcGFnZUV4dGVuc2lvbnM9anMmcm9vdERpcj0lMkZVc2VycyUyRmZlbGl4cGxhbnQlMkZEb3dubG9hZHMlMkZGZWxpeCUyRkdpdEh1Yi1SZXBvJTJGUk1TJmlzRGV2PXRydWUmdHNjb25maWdQYXRoPXRzY29uZmlnLmpzb24mYmFzZVBhdGg9JmFzc2V0UHJlZml4PSZuZXh0Q29uZmlnT3V0cHV0PSZwcmVmZXJyZWRSZWdpb249Jm1pZGRsZXdhcmVDb25maWc9ZTMwJTNEISIsIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7OztBQUErRjtBQUN2QztBQUNxQjtBQUNnQztBQUM3RztBQUNBO0FBQ0E7QUFDQSx3QkFBd0IseUdBQW1CO0FBQzNDO0FBQ0EsY0FBYyxrRUFBUztBQUN2QjtBQUNBO0FBQ0E7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsWUFBWTtBQUNaLENBQUM7QUFDRDtBQUNBO0FBQ0E7QUFDQSxRQUFRLHNEQUFzRDtBQUM5RDtBQUNBLFdBQVcsNEVBQVc7QUFDdEI7QUFDQTtBQUNBLEtBQUs7QUFDTDtBQUMwRjs7QUFFMUYiLCJzb3VyY2VzIjpbIiJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBcHBSb3V0ZVJvdXRlTW9kdWxlIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvcm91dGUtbW9kdWxlcy9hcHAtcm91dGUvbW9kdWxlLmNvbXBpbGVkXCI7XG5pbXBvcnQgeyBSb3V0ZUtpbmQgfSBmcm9tIFwibmV4dC9kaXN0L3NlcnZlci9yb3V0ZS1raW5kXCI7XG5pbXBvcnQgeyBwYXRjaEZldGNoIGFzIF9wYXRjaEZldGNoIH0gZnJvbSBcIm5leHQvZGlzdC9zZXJ2ZXIvbGliL3BhdGNoLWZldGNoXCI7XG5pbXBvcnQgKiBhcyB1c2VybGFuZCBmcm9tIFwiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy9hcHAvYXBpL2ZpbmFuemVuL1tpZF0vcm91dGUudHNcIjtcbi8vIFdlIGluamVjdCB0aGUgbmV4dENvbmZpZ091dHB1dCBoZXJlIHNvIHRoYXQgd2UgY2FuIHVzZSB0aGVtIGluIHRoZSByb3V0ZVxuLy8gbW9kdWxlLlxuY29uc3QgbmV4dENvbmZpZ091dHB1dCA9IFwiXCJcbmNvbnN0IHJvdXRlTW9kdWxlID0gbmV3IEFwcFJvdXRlUm91dGVNb2R1bGUoe1xuICAgIGRlZmluaXRpb246IHtcbiAgICAgICAga2luZDogUm91dGVLaW5kLkFQUF9ST1VURSxcbiAgICAgICAgcGFnZTogXCIvYXBpL2ZpbmFuemVuL1tpZF0vcm91dGVcIixcbiAgICAgICAgcGF0aG5hbWU6IFwiL2FwaS9maW5hbnplbi9baWRdXCIsXG4gICAgICAgIGZpbGVuYW1lOiBcInJvdXRlXCIsXG4gICAgICAgIGJ1bmRsZVBhdGg6IFwiYXBwL2FwaS9maW5hbnplbi9baWRdL3JvdXRlXCJcbiAgICB9LFxuICAgIHJlc29sdmVkUGFnZVBhdGg6IFwiL1VzZXJzL2ZlbGl4cGxhbnQvRG93bmxvYWRzL0ZlbGl4L0dpdEh1Yi1SZXBvL1JNUy9hcHAvYXBpL2ZpbmFuemVuL1tpZF0vcm91dGUudHNcIixcbiAgICBuZXh0Q29uZmlnT3V0cHV0LFxuICAgIHVzZXJsYW5kXG59KTtcbi8vIFB1bGwgb3V0IHRoZSBleHBvcnRzIHRoYXQgd2UgbmVlZCB0byBleHBvc2UgZnJvbSB0aGUgbW9kdWxlLiBUaGlzIHNob3VsZFxuLy8gYmUgZWxpbWluYXRlZCB3aGVuIHdlJ3ZlIG1vdmVkIHRoZSBvdGhlciByb3V0ZXMgdG8gdGhlIG5ldyBmb3JtYXQuIFRoZXNlXG4vLyBhcmUgdXNlZCB0byBob29rIGludG8gdGhlIHJvdXRlLlxuY29uc3QgeyB3b3JrQXN5bmNTdG9yYWdlLCB3b3JrVW5pdEFzeW5jU3RvcmFnZSwgc2VydmVySG9va3MgfSA9IHJvdXRlTW9kdWxlO1xuZnVuY3Rpb24gcGF0Y2hGZXRjaCgpIHtcbiAgICByZXR1cm4gX3BhdGNoRmV0Y2goe1xuICAgICAgICB3b3JrQXN5bmNTdG9yYWdlLFxuICAgICAgICB3b3JrVW5pdEFzeW5jU3RvcmFnZVxuICAgIH0pO1xufVxuZXhwb3J0IHsgcm91dGVNb2R1bGUsIHdvcmtBc3luY1N0b3JhZ2UsIHdvcmtVbml0QXN5bmNTdG9yYWdlLCBzZXJ2ZXJIb29rcywgcGF0Y2hGZXRjaCwgIH07XG5cbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWFwcC1yb3V0ZS5qcy5tYXAiXSwibmFtZXMiOltdLCJpZ25vcmVMaXN0IjpbXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ffinanzen%2F%5Bid%5D%2Froute&page=%2Fapi%2Ffinanzen%2F%5Bid%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffinanzen%2F%5Bid%5D%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!\n");

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
var __webpack_require__ = require("../../../../webpack-runtime.js");
__webpack_require__.C(exports);
var __webpack_exec__ = (moduleId) => (__webpack_require__(__webpack_require__.s = moduleId))
var __webpack_exports__ = __webpack_require__.X(0, ["vendor-chunks/next","vendor-chunks/@supabase","vendor-chunks/tr46","vendor-chunks/whatwg-url","vendor-chunks/cookie","vendor-chunks/webidl-conversions"], () => (__webpack_exec__("(rsc)/./node_modules/next/dist/build/webpack/loaders/next-app-loader/index.js?name=app%2Fapi%2Ffinanzen%2F%5Bid%5D%2Froute&page=%2Fapi%2Ffinanzen%2F%5Bid%5D%2Froute&appPaths=&pagePath=private-next-app-dir%2Fapi%2Ffinanzen%2F%5Bid%5D%2Froute.ts&appDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS%2Fapp&pageExtensions=tsx&pageExtensions=ts&pageExtensions=jsx&pageExtensions=js&rootDir=%2FUsers%2Ffelixplant%2FDownloads%2FFelix%2FGitHub-Repo%2FRMS&isDev=true&tsconfigPath=tsconfig.json&basePath=&assetPrefix=&nextConfigOutput=&preferredRegion=&middlewareConfig=e30%3D!")));
module.exports = __webpack_exports__;

})();