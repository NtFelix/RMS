2025-07-03T08:20:49.2309445Z Current runner version: '2.325.0'
2025-07-03T08:20:49.2343810Z ##[group]Runner Image Provisioner
2025-07-03T08:20:49.2345493Z Hosted Compute Agent
2025-07-03T08:20:49.2346480Z Version: 20250620.352
2025-07-03T08:20:49.2347425Z Commit: f262f3aba23b10ea191b2a62bdee1ca4c3d344da
2025-07-03T08:20:49.2348581Z Build Date: 2025-06-20T19:27:17Z
2025-07-03T08:20:49.2349549Z ##[endgroup]
2025-07-03T08:20:49.2350672Z ##[group]Operating System
2025-07-03T08:20:49.2351670Z Ubuntu
2025-07-03T08:20:49.2352531Z 24.04.2
2025-07-03T08:20:49.2353503Z LTS
2025-07-03T08:20:49.2354269Z ##[endgroup]
2025-07-03T08:20:49.2355325Z ##[group]Runner Image
2025-07-03T08:20:49.2356422Z Image: ubuntu-24.04
2025-07-03T08:20:49.2357366Z Version: 20250622.1.0
2025-07-03T08:20:49.2359262Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20250622.1/images/ubuntu/Ubuntu2404-Readme.md
2025-07-03T08:20:49.2362182Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20250622.1
2025-07-03T08:20:49.2363812Z ##[endgroup]
2025-07-03T08:20:49.2366150Z ##[group]GITHUB_TOKEN Permissions
2025-07-03T08:20:49.2368998Z Contents: read
2025-07-03T08:20:49.2370474Z Metadata: read
2025-07-03T08:20:49.2371390Z Packages: read
2025-07-03T08:20:49.2372226Z ##[endgroup]
2025-07-03T08:20:49.2375850Z Secret source: Actions
2025-07-03T08:20:49.2376964Z Prepare workflow directory
2025-07-03T08:20:49.2733227Z Prepare all required actions
2025-07-03T08:20:49.2790613Z Getting action download info
2025-07-03T08:20:49.9499670Z ##[group]Download immutable action package 'actions/checkout@v4'
2025-07-03T08:20:49.9500962Z Version: 4.2.2
2025-07-03T08:20:49.9502137Z Digest: sha256:ccb2698953eaebd21c7bf6268a94f9c26518a7e38e27e0b83c1fe1ad049819b1
2025-07-03T08:20:49.9503323Z Source commit SHA: 11bd71901bbe5b1630ceea73d27597364c9af683
2025-07-03T08:20:49.9504070Z ##[endgroup]
2025-07-03T08:20:50.0367478Z ##[group]Download immutable action package 'actions/setup-node@v4'
2025-07-03T08:20:50.0368341Z Version: 4.4.0
2025-07-03T08:20:50.0369179Z Digest: sha256:9427cefe82346e992fb5b949e3569b39d537ae41aa3086483b14eceebfc16bc1
2025-07-03T08:20:50.0370263Z Source commit SHA: 49933ea5288caeca8642d1e84afbd3f7d6820020
2025-07-03T08:20:50.0371045Z ##[endgroup]
2025-07-03T08:20:50.1346770Z Download action repository 'treosh/lighthouse-ci-action@v11' (SHA:72f881228236981b625ed765b928efb1786a1f55)
2025-07-03T08:20:58.1740009Z ##[group]Download immutable action package 'actions/upload-artifact@v4'
2025-07-03T08:20:58.1740490Z Version: 4.6.2
2025-07-03T08:20:58.1740883Z Digest: sha256:290722aa3281d5caf23d0acdc3dbeb3424786a1a01a9cc97e72f147225e37c38
2025-07-03T08:20:58.1741386Z Source commit SHA: ea165f8d65b6e75b540449e92b4886f43607fa02
2025-07-03T08:20:58.1741715Z ##[endgroup]
2025-07-03T08:20:58.3767679Z Complete job name: build-and-lighthouse
2025-07-03T08:20:58.4377705Z ##[group]Run actions/checkout@v4
2025-07-03T08:20:58.4378269Z with:
2025-07-03T08:20:58.4378483Z   repository: NtFelix/RMS
2025-07-03T08:20:58.4378839Z   token: ***
2025-07-03T08:20:58.4379050Z   ssh-strict: true
2025-07-03T08:20:58.4379240Z   ssh-user: git
2025-07-03T08:20:58.4379451Z   persist-credentials: true
2025-07-03T08:20:58.4379671Z   clean: true
2025-07-03T08:20:58.4379887Z   sparse-checkout-cone-mode: true
2025-07-03T08:20:58.4380156Z   fetch-depth: 1
2025-07-03T08:20:58.4380348Z   fetch-tags: false
2025-07-03T08:20:58.4380561Z   show-progress: true
2025-07-03T08:20:58.4380757Z   lfs: false
2025-07-03T08:20:58.4380952Z   submodules: false
2025-07-03T08:20:58.4381148Z   set-safe-directory: true
2025-07-03T08:20:58.4381549Z ##[endgroup]
2025-07-03T08:20:58.5520162Z Syncing repository: NtFelix/RMS
2025-07-03T08:20:58.5521894Z ##[group]Getting Git version info
2025-07-03T08:20:58.5522470Z Working directory is '/home/runner/work/RMS/RMS'
2025-07-03T08:20:58.5523324Z [command]/usr/bin/git version
2025-07-03T08:20:58.5574369Z git version 2.49.0
2025-07-03T08:20:58.5601836Z ##[endgroup]
2025-07-03T08:20:58.5620277Z Temporarily overriding HOME='/home/runner/work/_temp/adc3c6bc-d818-4b35-9d83-2442206d1a6f' before making global git config changes
2025-07-03T08:20:58.5622022Z Adding repository directory to the temporary git global config as a safe directory
2025-07-03T08:20:58.5625284Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/RMS/RMS
2025-07-03T08:20:58.5658928Z Deleting the contents of '/home/runner/work/RMS/RMS'
2025-07-03T08:20:58.5662800Z ##[group]Initializing the repository
2025-07-03T08:20:58.5668141Z [command]/usr/bin/git init /home/runner/work/RMS/RMS
2025-07-03T08:20:58.5727308Z hint: Using 'master' as the name for the initial branch. This default branch name
2025-07-03T08:20:58.5733200Z hint: is subject to change. To configure the initial branch name to use in all
2025-07-03T08:20:58.5734046Z hint: of your new repositories, which will suppress this warning, call:
2025-07-03T08:20:58.5734651Z hint:
2025-07-03T08:20:58.5735355Z hint: 	git config --global init.defaultBranch <name>
2025-07-03T08:20:58.5735915Z hint:
2025-07-03T08:20:58.5739773Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
2025-07-03T08:20:58.5740799Z hint: 'development'. The just-created branch can be renamed via this command:
2025-07-03T08:20:58.5743358Z hint:
2025-07-03T08:20:58.5743830Z hint: 	git branch -m <name>
2025-07-03T08:20:58.5744652Z Initialized empty Git repository in /home/runner/work/RMS/RMS/.git/
2025-07-03T08:20:58.5749945Z [command]/usr/bin/git remote add origin https://github.com/NtFelix/RMS
2025-07-03T08:20:58.5797065Z ##[endgroup]
2025-07-03T08:20:58.5798279Z ##[group]Disabling automatic garbage collection
2025-07-03T08:20:58.5799514Z [command]/usr/bin/git config --local gc.auto 0
2025-07-03T08:20:58.5837564Z ##[endgroup]
2025-07-03T08:20:58.5839182Z ##[group]Setting up auth
2025-07-03T08:20:58.5840357Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-07-03T08:20:58.5874243Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-07-03T08:20:58.6145182Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-07-03T08:20:58.6177653Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-07-03T08:20:58.6408683Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
2025-07-03T08:20:58.6448948Z ##[endgroup]
2025-07-03T08:20:58.6450943Z ##[group]Fetching the repository
2025-07-03T08:20:58.6459243Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +baff0afd9721c1fcb3e2eef0de6f6ced41b9f612:refs/remotes/pull/247/merge
2025-07-03T08:20:59.2842502Z From https://github.com/NtFelix/RMS
2025-07-03T08:20:59.2846042Z  * [new ref]         baff0afd9721c1fcb3e2eef0de6f6ced41b9f612 -> pull/247/merge
2025-07-03T08:20:59.2895075Z ##[endgroup]
2025-07-03T08:20:59.2898920Z ##[group]Determining the checkout info
2025-07-03T08:20:59.2910438Z ##[endgroup]
2025-07-03T08:20:59.2915502Z [command]/usr/bin/git sparse-checkout disable
2025-07-03T08:20:59.2988102Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
2025-07-03T08:20:59.3045446Z ##[group]Checking out the ref
2025-07-03T08:20:59.3049570Z [command]/usr/bin/git checkout --progress --force refs/remotes/pull/247/merge
2025-07-03T08:20:59.3247746Z Note: switching to 'refs/remotes/pull/247/merge'.
2025-07-03T08:20:59.3250059Z 
2025-07-03T08:20:59.3252007Z You are in 'detached HEAD' state. You can look around, make experimental
2025-07-03T08:20:59.3252922Z changes and commit them, and you can discard any commits you make in this
2025-07-03T08:20:59.3253687Z state without impacting any branches by switching back to a branch.
2025-07-03T08:20:59.3254151Z 
2025-07-03T08:20:59.3254487Z If you want to create a new branch to retain commits you create, you may
2025-07-03T08:20:59.3258916Z do so (now or later) by using -c with the switch command. Example:
2025-07-03T08:20:59.3259356Z 
2025-07-03T08:20:59.3259529Z   git switch -c <new-branch-name>
2025-07-03T08:20:59.3259826Z 
2025-07-03T08:20:59.3259996Z Or undo this operation with:
2025-07-03T08:20:59.3260275Z 
2025-07-03T08:20:59.3260427Z   git switch -
2025-07-03T08:20:59.3260676Z 
2025-07-03T08:20:59.3261060Z Turn off this advice by setting config variable advice.detachedHead to false
2025-07-03T08:20:59.3261607Z 
2025-07-03T08:20:59.3262264Z HEAD is now at baff0af Merge 8cb5c3017cdd0f7e3f5e9e41264e951cbbfbf07a into 7d95cb47c526dc38811778a0145d370107811599
2025-07-03T08:20:59.3264216Z ##[endgroup]
2025-07-03T08:20:59.3300873Z [command]/usr/bin/git log -1 --format=%H
2025-07-03T08:20:59.3323547Z baff0afd9721c1fcb3e2eef0de6f6ced41b9f612
2025-07-03T08:20:59.3557971Z ##[group]Run actions/setup-node@v4
2025-07-03T08:20:59.3558253Z with:
2025-07-03T08:20:59.3558435Z   node-version: 20
2025-07-03T08:20:59.3558639Z   always-auth: false
2025-07-03T08:20:59.3558839Z   check-latest: false
2025-07-03T08:20:59.3559140Z   token: ***
2025-07-03T08:20:59.3559332Z ##[endgroup]
2025-07-03T08:20:59.5428551Z Found in cache @ /opt/hostedtoolcache/node/20.19.2/x64
2025-07-03T08:20:59.5434055Z ##[group]Environment details
2025-07-03T08:21:01.8447930Z node: v20.19.2
2025-07-03T08:21:01.8450028Z npm: 10.8.2
2025-07-03T08:21:01.8450505Z yarn: 1.22.22
2025-07-03T08:21:01.8451332Z ##[endgroup]
2025-07-03T08:21:01.8582702Z ##[group]Run if [ -f yarn.lock ]; then
2025-07-03T08:21:01.8583072Z [36;1mif [ -f yarn.lock ]; then[0m
2025-07-03T08:21:01.8583349Z [36;1m  yarn install --frozen-lockfile[0m
2025-07-03T08:21:01.8583610Z [36;1melse[0m
2025-07-03T08:21:01.8583787Z [36;1m  npm ci[0m
2025-07-03T08:21:01.8583980Z [36;1mfi[0m
2025-07-03T08:21:01.8677608Z shell: /usr/bin/bash -e {0}
2025-07-03T08:21:01.8677873Z ##[endgroup]
2025-07-03T08:21:08.3024729Z npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
2025-07-03T08:21:09.4730300Z npm warn deprecated critters@0.0.25: Ownership of Critters has moved to the Nuxt team, who will be maintaining the project going forward. If you'd like to keep using Critters, please switch to the actively-maintained fork at https://github.com/danielroe/beasties
2025-07-03T08:21:09.7469875Z npm warn deprecated @supabase/auth-helpers-shared@0.7.0: This package is now deprecated - please use the @supabase/ssr package instead.
2025-07-03T08:21:10.6384280Z npm warn deprecated @supabase/auth-helpers-nextjs@0.10.0: This package is now deprecated - please use the @supabase/ssr package instead.
2025-07-03T08:21:11.1608576Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2025-07-03T08:21:11.3450179Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2025-07-03T08:21:11.4246541Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2025-07-03T08:21:11.5849780Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2025-07-03T08:21:24.9516022Z 
2025-07-03T08:21:24.9550994Z added 763 packages, and audited 764 packages in 23s
2025-07-03T08:21:24.9551622Z 
2025-07-03T08:21:24.9555423Z 100 packages are looking for funding
2025-07-03T08:21:24.9555938Z   run `npm fund` for details
2025-07-03T08:21:24.9556233Z 
2025-07-03T08:21:24.9556435Z 1 low severity vulnerability
2025-07-03T08:21:24.9556698Z 
2025-07-03T08:21:24.9556904Z To address all issues, run:
2025-07-03T08:21:24.9557321Z   npm audit fix
2025-07-03T08:21:24.9557528Z 
2025-07-03T08:21:24.9557709Z Run `npm audit` for details.
2025-07-03T08:21:24.9964242Z ##[group]Run npm run build
2025-07-03T08:21:24.9964526Z [36;1mnpm run build[0m
2025-07-03T08:21:25.0024186Z shell: /usr/bin/bash -e {0}
2025-07-03T08:21:25.0024436Z ##[endgroup]
2025-07-03T08:21:25.1226786Z 
2025-07-03T08:21:25.1228231Z > my-v0-project@0.1.0 build
2025-07-03T08:21:25.1229997Z > next build
2025-07-03T08:21:25.1230200Z 
2025-07-03T08:21:25.7007394Z ⚠ No build cache found. Please configure build caching for faster rebuilds. Read more: https://nextjs.org/docs/messages/no-cache
2025-07-03T08:21:25.7191372Z Attention: Next.js now collects completely anonymous telemetry regarding usage.
2025-07-03T08:21:25.7196513Z This information is used to shape Next.js' roadmap and prioritize features.
2025-07-03T08:21:25.7208473Z You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
2025-07-03T08:21:25.7225848Z https://nextjs.org/telemetry
2025-07-03T08:21:25.7226800Z 
2025-07-03T08:21:25.7869349Z    ▲ Next.js 15.3.1
2025-07-03T08:21:25.7874106Z    - Environments: .env
2025-07-03T08:21:25.7879177Z    - Experiments (use with caution):
2025-07-03T08:21:25.7883987Z      ✓ optimizeCss
2025-07-03T08:21:25.7888778Z      ✓ scrollRestoration
2025-07-03T08:21:25.7893060Z 
2025-07-03T08:21:25.8547667Z    Creating an optimized production build ...
2025-07-03T08:22:11.9146663Z  ✓ Compiled successfully in 45s
2025-07-03T08:22:11.9596048Z    Linting and checking validity of types ...
2025-07-03T08:22:25.7058105Z    Collecting page data ...
2025-07-03T08:22:26.2176710Z  ⚠ Using edge runtime on a page currently disables static generation for that page
2025-07-03T08:22:29.0359682Z    Generating static pages (0/14) ...
2025-07-03T08:22:30.1352476Z    Generating static pages (3/14) 
2025-07-03T08:22:30.1354259Z    Generating static pages (6/14) 
2025-07-03T08:22:30.3381653Z    Generating static pages (10/14) 
2025-07-03T08:22:30.3383406Z  ✓ Generating static pages (14/14)
2025-07-03T08:22:30.6613253Z    Finalizing page optimization ...
2025-07-03T08:22:30.6615436Z    Collecting build traces ...
2025-07-03T08:22:38.5539555Z 
2025-07-03T08:22:38.5655982Z Route (app)                                 Size  First Load JS
2025-07-03T08:22:38.5657520Z ┌ ○ /                                      201 B         241 kB
2025-07-03T08:22:38.5665493Z ├ ○ /_not-found                            990 B         103 kB
2025-07-03T08:22:38.5666391Z ├ ƒ /api/export                            210 B         102 kB
2025-07-03T08:22:38.5667180Z ├ ƒ /api/finanzen                          210 B         102 kB
2025-07-03T08:22:38.5667971Z ├ ƒ /api/finanzen/[id]                     210 B         102 kB
2025-07-03T08:22:38.5668699Z ├ ƒ /api/haeuser                           210 B         102 kB
2025-07-03T08:22:38.5669415Z ├ ƒ /api/mieter                            210 B         102 kB
2025-07-03T08:22:38.5670250Z ├ ƒ /api/stripe/cancel-subscription        210 B         102 kB
2025-07-03T08:22:38.5671197Z ├ ƒ /api/stripe/checkout-session           210 B         102 kB
2025-07-03T08:22:38.5672173Z ├ ƒ /api/stripe/customer-portal            210 B         102 kB
2025-07-03T08:22:38.5673029Z ├ ƒ /api/stripe/plans                      210 B         102 kB
2025-07-03T08:22:38.5673928Z ├ ƒ /api/stripe/verify-session             210 B         102 kB
2025-07-03T08:22:38.5675000Z ├ ƒ /api/stripe/webhook                    210 B         102 kB
2025-07-03T08:22:38.5675902Z ├ ƒ /api/todos                             210 B         102 kB
2025-07-03T08:22:38.5676753Z ├ ƒ /api/todos/[id]                        210 B         102 kB
2025-07-03T08:22:38.5677536Z ├ ƒ /api/user/profile                      210 B         102 kB
2025-07-03T08:22:38.5678397Z ├ ƒ /api/wohnungen                         210 B         102 kB
2025-07-03T08:22:38.5679224Z ├ ƒ /auth/callback                         210 B         102 kB
2025-07-03T08:22:38.5680103Z ├ ○ /auth/login                          4.21 kB         156 kB
2025-07-03T08:22:38.5681304Z ├ ○ /auth/register                        4.3 kB         156 kB
2025-07-03T08:22:38.5682367Z ├ ○ /auth/reset-password                 4.09 kB         155 kB
2025-07-03T08:22:38.5683311Z ├ ○ /auth/update-password                4.07 kB         152 kB
2025-07-03T08:22:38.5684557Z ├ ƒ /betriebskosten                      19.8 kB         208 kB
2025-07-03T08:22:38.5685739Z ├ ○ /checkout/cancel                     1.91 kB         114 kB
2025-07-03T08:22:38.5686584Z ├ ○ /checkout/success                    3.41 kB         116 kB
2025-07-03T08:22:38.5687426Z ├ ƒ /finanzen                            17.7 kB         273 kB
2025-07-03T08:22:38.5688220Z ├ ƒ /haeuser                             8.99 kB         148 kB
2025-07-03T08:22:38.5689010Z ├ ƒ /home                                5.24 kB         292 kB
2025-07-03T08:22:38.5689782Z ├ ○ /landing                               202 B         241 kB
2025-07-03T08:22:38.5690549Z ├ ƒ /mieter                              5.94 kB         231 kB
2025-07-03T08:22:38.5691424Z ├ ○ /modern/documentation                4.98 kB         231 kB
2025-07-03T08:22:38.5692289Z ├ ○ /subscription                        6.93 kB         116 kB
2025-07-03T08:22:38.5693152Z ├ ○ /subscription-locked                 3.54 kB         117 kB
2025-07-03T08:22:38.5694120Z ├ ƒ /todos                                9.9 kB         161 kB
2025-07-03T08:22:38.5695166Z └ ƒ /wohnungen                           8.01 kB         186 kB
2025-07-03T08:22:38.5695869Z + First Load JS shared by all             102 kB
2025-07-03T08:22:38.5696610Z   ├ chunks/1317-4be7c8f2dda6a784.js      46.4 kB
2025-07-03T08:22:38.5697318Z   ├ chunks/4bd1b696-86b7f7b384ded616.js  53.2 kB
2025-07-03T08:22:38.5698006Z   └ other shared chunks (total)          2.24 kB
2025-07-03T08:22:38.5698371Z 
2025-07-03T08:22:38.5698381Z 
2025-07-03T08:22:38.5698768Z ƒ Middleware                             66.2 kB
2025-07-03T08:22:38.5699091Z 
2025-07-03T08:22:38.5699472Z ○  (Static)   prerendered as static content
2025-07-03T08:22:38.5700176Z ƒ  (Dynamic)  server-rendered on demand
2025-07-03T08:22:38.5700545Z 
2025-07-03T08:22:38.6796941Z ##[group]Run treosh/lighthouse-ci-action@v11
2025-07-03T08:22:38.6797451Z with:
2025-07-03T08:22:38.6797826Z   urls: http://localhost:3000

2025-07-03T08:22:38.6798264Z   uploadArtifacts: true
2025-07-03T08:22:38.6798702Z   temporaryPublicStorage: false
2025-07-03T08:22:38.6799194Z   budgetPath: ./.github/lighthouse-budget.json
2025-07-03T08:22:38.6799729Z   artifactName: lighthouse-results
2025-07-03T08:22:38.6800167Z ##[endgroup]
2025-07-03T08:22:39.3401406Z /home/runner/work/_actions/treosh/lighthouse-ci-action/v11/node_modules/@lhci/cli/src/cli.js
2025-07-03T08:22:39.3408910Z ##[group]Action config
2025-07-03T08:22:39.3412707Z Input args: {
2025-07-03T08:22:39.3413439Z   "urls": [
2025-07-03T08:22:39.3414079Z     "http://localhost:3000"
2025-07-03T08:22:39.3415260Z   ],
2025-07-03T08:22:39.3415836Z   "runs": 1,
2025-07-03T08:22:39.3416538Z   "staticDistDir": null,
2025-07-03T08:22:39.3417327Z   "budgetPath": "./.github/lighthouse-budget.json",
2025-07-03T08:22:39.3418179Z   "configPath": null,
2025-07-03T08:22:39.3418751Z   "serverBaseUrl": "",
2025-07-03T08:22:39.3419330Z   "serverToken": "",
2025-07-03T08:22:39.3419957Z   "temporaryPublicStorage": false,
2025-07-03T08:22:39.3420643Z   "uploadArtifacts": true,
2025-07-03T08:22:39.3421283Z   "uploadExtraArgs": "",
2025-07-03T08:22:39.3422019Z   "basicAuthUsername": "lighthouse",
2025-07-03T08:22:39.3422826Z   "basicAuthPassword": "",
2025-07-03T08:22:39.3423668Z   "artifactName": "lighthouse-results"
2025-07-03T08:22:39.3424411Z }
2025-07-03T08:22:39.3425528Z ##[endgroup]
2025-07-03T08:22:39.3426404Z ##[group]Collecting
2025-07-03T08:22:39.6588540Z Running Lighthouse 1 time(s) on http://localhost:3000
2025-07-03T08:23:06.9286102Z Run #1...failed!
2025-07-03T08:23:06.9291473Z Error: Lighthouse failed with exit code 1
2025-07-03T08:23:06.9296338Z     at ChildProcess.<anonymous> (/home/runner/work/_actions/treosh/lighthouse-ci-action/v11/node_modules/@lhci/cli/src/collect/node-runner.js:120:21)
2025-07-03T08:23:06.9299370Z     at ChildProcess.emit (node:events:524:28)
2025-07-03T08:23:06.9300047Z     at ChildProcess._handle.onexit (node:internal/child_process:293:12)
2025-07-03T08:23:06.9300612Z {
2025-07-03T08:23:06.9300907Z   "lighthouseVersion": "11.4.0",
2025-07-03T08:23:06.9301715Z   "requestedUrl": "http://localhost:3000/",
2025-07-03T08:23:06.9302291Z   "mainDocumentUrl": "chrome-error://chromewebdata/",
2025-07-03T08:23:06.9302912Z   "finalDisplayedUrl": "chrome-error://chromewebdata/",
2025-07-03T08:23:06.9303506Z   "finalUrl": "chrome-error://chromewebdata/",
2025-07-03T08:23:06.9304019Z   "fetchTime": "2025-07-03T08:22:48.977Z",
2025-07-03T08:23:06.9304456Z   "gatherMode": "navigation",
2025-07-03T08:23:06.9305020Z   "runtimeError": {
2025-07-03T08:23:06.9307159Z     "code": "CHROME_INTERSTITIAL_ERROR",
2025-07-03T08:23:06.9308402Z     "message": "Chrome prevented page load with an interstitial. Make sure you are testing the correct URL and that the server is properly responding to all requests."
2025-07-03T08:23:06.9309448Z   },
2025-07-03T08:23:06.9309742Z   "runWarnings": [
2025-07-03T08:23:06.9310973Z     "The page may not be loading as expected because your test URL (http://localhost:3000/) was redirected to chrome-error://chromewebdata/. Try testing the second URL directly.",
2025-07-03T08:23:06.9312844Z     "Chrome prevented page load with an interstitial. Make sure you are testing the correct URL and that the server is properly responding to all requests."
2025-07-03T08:23:06.9313954Z   ],
2025-07-03T08:23:06.9314781Z   "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/137.0.0.0 Safari/537.36",
2025-07-03T08:23:06.9324342Z   "environment": {
2025-07-03T08:23:06.9325992Z     "hostUserAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/137.0.0.0 Safari/537.36",
2025-07-03T08:23:06.9326856Z     "benchmarkIndex": 2100,
2025-07-03T08:23:06.9327206Z     "credits": {}
2025-07-03T08:23:06.9327498Z   },
2025-07-03T08:23:06.9328031Z   "audits": {
2025-07-03T08:23:06.9328364Z     "is-on-https": {
2025-07-03T08:23:06.9328712Z       "id": "is-on-https",
2025-07-03T08:23:06.9329077Z       "title": "Uses HTTPS",
2025-07-03T08:23:06.9333335Z       "description": "All sites should be protected with HTTPS, even ones that don't handle sensitive data. This includes avoiding [mixed content](https://developers.google.com/web/fundamentals/security/prevent-mixed-content/what-is-mixed-content), where some resources are loaded over HTTP despite the initial request being served over HTTPS. HTTPS prevents intruders from tampering with or passively listening in on the communications between your app and your users, and is a prerequisite for HTTP/2 and many new web platform APIs. [Learn more about HTTPS](https://developer.chrome.com/docs/lighthouse/pwa/is-on-https/).",
2025-07-03T08:23:06.9337202Z       "score": null,
2025-07-03T08:23:06.9337595Z       "scoreDisplayMode": "error",
2025-07-03T08:23:06.9338876Z       "errorMessage": "Chrome prevented page load with an interstitial. Make sure you are testing the correct URL and that the server is properly responding to all requests.",
2025-07-03T08:23:06.9350052Z       "errorStack": "LighthouseError: CHROME_INTERSTITIAL_ERROR\n    at getInterstitialError (file:///home/runner/work/_actions/treosh/lighthouse-ci-action/v11/node_modules/lighthouse/core/lib/navigation-error.js:97:10)\n    at getPageLoadError (file:///home/runner/work/_actions/treosh/lighthouse-ci-action/v11/node_modules/lighthouse/core/lib/navigation-error.js:160:29)\n    at _computeNavigationResult (file:///home/runner/work/_actions/treosh/lighthouse-ci-action/v11/node_modules/lighthouse/core/gather/navigation-runner.js:156:7)\n    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)\n    at async file:///home/runner/work/_actions/treosh/lighthouse-ci-action/v11/node_modules/lighthouse/core/gather/navigation-runner.js:310:25\n    at async Runner.gather (file:///home/runner/work/_actions/treosh/lighthouse-ci-action/v11/node_modules/lighthouse/core/runner.js:212:21)\n    at async navigationGather (file:///home/runner/work/_actions/treosh/lighthouse-ci-action/v11/node_modules/lighthouse/core/gather/navigation-runner.js:280:21)\n    at async navigation (file:///home/runner/work/_actions/treosh/lighthouse-ci-action/v11/node_modules/lighthouse/core/index.js:58:24)\n    at async runLighthouse (file:///home/runner/work/_actions/treosh/lighthouse-ci-action/v11/node_modules/lighthouse/cli/run.js:243:26)\n    at async file:///home/runner/work/_actions/treosh/lighthouse-ci-action/v11/node_modules/lighthouse/cli/index.js:10:1"
2025-07-03T08:23:06.9389397Z     },
2025-07-03T08:23:06.9389712Z     "viewport": {
2025-07-03T08:23:06.9390037Z       "id": "viewport",
2025-07-03T08:23:06.9390664Z       "title": "Has a `<meta name=\"viewport\">` tag with `width` or `initial-scale`",
2025-07-03T08:23:06.9392320Z       "description": "A `<meta name=\"viewport\">` not only optimizes your app for mobile screen sizes, but also prevents [a 300 millisecond delay to user input](https://developer.chrome.com/blog/300ms-tap-delay-
2025-07-03T08:23:06.9393873Z Thu, 03 Jul 2025 08:22:40 GMT LH:ChromeLauncher Waiting for browser.
2025-07-03T08:23:06.9394689Z Thu, 03 Jul 2025 08:22:40 GMT LH:ChromeLauncher Waiting for browser...
2025-07-03T08:23:06.9408487Z Thu, 03 Jul 2025 08:22:40 GMT LH:ChromeLauncher Waiting for browser.....
2025-07-03T08:23:06.9409309Z Thu, 03 Jul 2025 08:22:41 GMT LH:ChromeLauncher Waiting for browser.......
2025-07-03T08:23:06.9410151Z Thu, 03 Jul 2025 08:22:41 GMT LH:ChromeLauncher Waiting for browser.........
2025-07-03T08:23:06.9410980Z Thu, 03 Jul 2025 08:22:42 GMT LH:ChromeLauncher Waiting for browser...........
2025-07-03T08:23:06.9411822Z Thu, 03 Jul 2025 08:22:42 GMT LH:ChromeLauncher Waiting for browser.............
2025-07-03T08:23:06.9412685Z Thu, 03 Jul 2025 08:22:43 GMT LH:ChromeLauncher Waiting for browser...............
2025-07-03T08:23:06.9413569Z Thu, 03 Jul 2025 08:22:43 GMT LH:ChromeLauncher Waiting for browser.................
2025-07-03T08:23:06.9415168Z Thu, 03 Jul 2025 08:22:44 GMT LH:ChromeLauncher Waiting for browser...................
2025-07-03T08:23:06.9416237Z Thu, 03 Jul 2025 08:22:44 GMT LH:ChromeLauncher Waiting for browser.....................
2025-07-03T08:23:06.9417217Z Thu, 03 Jul 2025 08:22:45 GMT LH:ChromeLauncher Waiting for browser.......................
2025-07-03T08:23:06.9418197Z Thu, 03 Jul 2025 08:22:45 GMT LH:ChromeLauncher Waiting for browser.........................
2025-07-03T08:23:06.9419622Z Thu, 03 Jul 2025 08:22:45 GMT LH:ChromeLauncher Waiting for browser.........................[32m✓[0m
2025-07-03T08:23:06.9420507Z Thu, 03 Jul 2025 08:22:47 GMT LH:status Connecting to browser
2025-07-03T08:23:06.9421216Z Thu, 03 Jul 2025 08:22:47 GMT LH:status Navigating to about:blank
2025-07-03T08:23:06.9421924Z Thu, 03 Jul 2025 08:22:47 GMT LH:status Benchmarking machine
2025-07-03T08:23:06.9422688Z Thu, 03 Jul 2025 08:22:48 GMT LH:status Preparing target for navigation mode
2025-07-03T08:23:06.9423441Z Thu, 03 Jul 2025 08:22:49 GMT LH:status Cleaning origin data
2025-07-03T08:23:06.9424118Z Thu, 03 Jul 2025 08:22:49 GMT LH:status Cleaning browser cache
2025-07-03T08:23:06.9425015Z Thu, 03 Jul 2025 08:22:49 GMT LH:status Preparing network conditions
2025-07-03T08:23:06.9426134Z Thu, 03 Jul 2025 08:22:49 GMT LH:status Navigating to http://localhost:3000/
2025-07-03T08:23:06.9427493Z Thu, 03 Jul 2025 08:22:52 GMT LH:Navigation:error Provided URL (http://localhost:3000/) did not match initial navigation URL (chrome-error://chromewebdata/)
2025-07-03T08:23:06.9428621Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Getting artifact: DevtoolsLog
2025-07-03T08:23:06.9429494Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Getting artifact: Trace
2025-07-03T08:23:06.9431429Z Thu, 03 Jul 2025 08:22:53 GMT LH:NavigationRunner:error Chrome prevented page load with an interstitial. Make sure you are testing the correct URL and that the server is properly responding to all requests. http://localhost:3000/
2025-07-03T08:23:06.9433093Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Analyzing and running audits...
2025-07-03T08:23:06.9433819Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Uses HTTPS
2025-07-03T08:23:06.9434689Z Thu, 03 Jul 2025 08:22:53 GMT LH:is-on-https:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9436411Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Has a `<meta name="viewport">` tag with `width` or `initial-scale`
2025-07-03T08:23:06.9437510Z Thu, 03 Jul 2025 08:22:53 GMT LH:viewport:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9438409Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: First Contentful Paint
2025-07-03T08:23:06.9439449Z Thu, 03 Jul 2025 08:22:53 GMT LH:first-contentful-paint:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9440538Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Largest Contentful Paint
2025-07-03T08:23:06.9441594Z Thu, 03 Jul 2025 08:22:53 GMT LH:largest-contentful-paint:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9442698Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: First Meaningful Paint
2025-07-03T08:23:06.9462887Z Thu, 03 Jul 2025 08:22:53 GMT LH:first-meaningful-paint:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9463846Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Speed Index
2025-07-03T08:23:06.9464732Z Thu, 03 Jul 2025 08:22:53 GMT LH:speed-index:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9469165Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Screenshot Thumbnails
2025-07-03T08:23:06.9470211Z Thu, 03 Jul 2025 08:22:53 GMT LH:screenshot-thumbnails:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9471099Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Final Screenshot
2025-07-03T08:23:06.9471998Z Thu, 03 Jul 2025 08:22:53 GMT LH:final-screenshot:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9472876Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Total Blocking Time
2025-07-03T08:23:06.9474043Z Thu, 03 Jul 2025 08:22:53 GMT LH:total-blocking-time:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9475350Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Max Potential First Input Delay
2025-07-03T08:23:06.9476395Z Thu, 03 Jul 2025 08:22:53 GMT LH:max-potential-fid:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9477308Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Cumulative Layout Shift
2025-07-03T08:23:06.9478294Z Thu, 03 Jul 2025 08:22:53 GMT LH:cumulative-layout-shift:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9479327Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: No browser errors logged to the console
2025-07-03T08:23:06.9480358Z Thu, 03 Jul 2025 08:22:53 GMT LH:errors-in-console:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9481399Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Initial server response time was short
2025-07-03T08:23:06.9482465Z Thu, 03 Jul 2025 08:22:53 GMT LH:server-response-time:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9483392Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Time to Interactive
2025-07-03T08:23:06.9484292Z Thu, 03 Jul 2025 08:22:53 GMT LH:interactive:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9485401Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: User Timing marks and measures
2025-07-03T08:23:06.9486334Z Thu, 03 Jul 2025 08:22:53 GMT LH:user-timings:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9487259Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoid chaining critical requests
2025-07-03T08:23:06.9488298Z Thu, 03 Jul 2025 08:22:53 GMT LH:critical-request-chains:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9489296Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoid multiple page redirects
2025-07-03T08:23:06.9490230Z Thu, 03 Jul 2025 08:22:53 GMT LH:redirects:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9491401Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Web app manifest and service worker meet the installability requirements
2025-07-03T08:23:06.9492602Z Thu, 03 Jul 2025 08:22:53 GMT LH:installable-manifest:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9493792Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Configured for a custom splash screen
2025-07-03T08:23:06.9494774Z Thu, 03 Jul 2025 08:22:53 GMT LH:splash-screen:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9495932Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Sets a theme color for the address bar.
2025-07-03T08:23:06.9496985Z Thu, 03 Jul 2025 08:22:53 GMT LH:themed-omnibox:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9497915Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Manifest has a maskable icon
2025-07-03T08:23:06.9498855Z Thu, 03 Jul 2025 08:22:53 GMT LH:maskable-icon:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9499884Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Content is sized correctly for the viewport
2025-07-03T08:23:06.9500903Z Thu, 03 Jul 2025 08:22:53 GMT LH:content-width:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9501895Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Displays images with correct aspect ratio
2025-07-03T08:23:06.9502956Z Thu, 03 Jul 2025 08:22:53 GMT LH:image-aspect-ratio:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9504009Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Serves images with appropriate resolution
2025-07-03T08:23:06.9505224Z Thu, 03 Jul 2025 08:22:53 GMT LH:image-size-responsive:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9506339Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Fonts with `font-display: optional` are preloaded
2025-07-03T08:23:06.9507388Z Thu, 03 Jul 2025 08:22:53 GMT LH:preload-fonts:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9508425Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoids deprecated APIs
2025-07-03T08:23:06.9509355Z Thu, 03 Jul 2025 08:22:53 GMT LH:deprecations:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9510260Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoids third-party cookies
2025-07-03T08:23:06.9511265Z Thu, 03 Jul 2025 08:22:53 GMT LH:third-party-cookies:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9512222Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Minimizes main-thread work
2025-07-03T08:23:06.9513260Z Thu, 03 Jul 2025 08:22:53 GMT LH:mainthread-work-breakdown:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9514243Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: JavaScript execution time
2025-07-03T08:23:06.9515286Z Thu, 03 Jul 2025 08:22:53 GMT LH:bootup-time:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9517796Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Preload key requests
2025-07-03T08:23:06.9518845Z Thu, 03 Jul 2025 08:22:53 GMT LH:uses-rel-preload:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9519862Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Preconnect to required origins
2025-07-03T08:23:06.9520954Z Thu, 03 Jul 2025 08:22:53 GMT LH:uses-rel-preconnect:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9522112Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: All text remains visible during webfont loads
2025-07-03T08:23:06.9523237Z Thu, 03 Jul 2025 08:22:53 GMT LH:font-display:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9524142Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Diagnostics
2025-07-03T08:23:06.9525386Z Thu, 03 Jul 2025 08:22:53 GMT LH:diagnostics:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9526327Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Network Requests
2025-07-03T08:23:06.9527348Z Thu, 03 Jul 2025 08:22:53 GMT LH:network-requests:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9528361Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Network Round Trip Times
2025-07-03T08:23:06.9529363Z Thu, 03 Jul 2025 08:22:53 GMT LH:network-rtt:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9530579Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Server Backend Latencies
2025-07-03T08:23:06.9531694Z Thu, 03 Jul 2025 08:22:53 GMT LH:network-server-latency:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9532678Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Tasks
2025-07-03T08:23:06.9533695Z Thu, 03 Jul 2025 08:22:53 GMT LH:main-thread-tasks:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9534697Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Metrics
2025-07-03T08:23:06.9535748Z Thu, 03 Jul 2025 08:22:53 GMT LH:metrics:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9536623Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Performance budget
2025-07-03T08:23:06.9537634Z Thu, 03 Jul 2025 08:22:53 GMT LH:performance-budget:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9538567Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Timing budget
2025-07-03T08:23:06.9539501Z Thu, 03 Jul 2025 08:22:53 GMT LH:timing-budget:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9540405Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Resources Summary
2025-07-03T08:23:06.9541401Z Thu, 03 Jul 2025 08:22:53 GMT LH:resource-summary:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9542382Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Minimize third-party usage
2025-07-03T08:23:06.9543421Z Thu, 03 Jul 2025 08:22:53 GMT LH:third-party-summary:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9544541Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Lazy load third-party resources with facades
2025-07-03T08:23:06.9545938Z Thu, 03 Jul 2025 08:22:53 GMT LH:third-party-facades:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9547188Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Largest Contentful Paint element
2025-07-03T08:23:06.9548389Z Thu, 03 Jul 2025 08:22:53 GMT LH:largest-contentful-paint-element:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9549658Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Largest Contentful Paint image was not lazily loaded
2025-07-03T08:23:06.9550799Z Thu, 03 Jul 2025 08:22:53 GMT LH:lcp-lazy-loaded:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9551769Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoid large layout shifts
2025-07-03T08:23:06.9552810Z Thu, 03 Jul 2025 08:22:53 GMT LH:layout-shift-elements:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9553828Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoid long main-thread tasks
2025-07-03T08:23:06.9554931Z Thu, 03 Jul 2025 08:22:53 GMT LH:long-tasks:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9555927Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoids `unload` event listeners
2025-07-03T08:23:06.9556978Z Thu, 03 Jul 2025 08:22:53 GMT LH:no-unload-listeners:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9557995Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoid non-composited animations
2025-07-03T08:23:06.9559112Z Thu, 03 Jul 2025 08:22:53 GMT LH:non-composited-animations:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9560246Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Image elements have explicit `width` and `height`
2025-07-03T08:23:06.9561269Z Thu, 03 Jul 2025 08:22:53 GMT LH:unsized-images:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9562160Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Page has valid source maps
2025-07-03T08:23:06.9563153Z Thu, 03 Jul 2025 08:22:53 GMT LH:valid-source-maps:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9564172Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Preload Largest Contentful Paint image
2025-07-03T08:23:06.9565479Z Thu, 03 Jul 2025 08:22:53 GMT LH:prioritize-lcp-image:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9566572Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Ensure CSP is effective against XSS attacks
2025-07-03T08:23:06.9567721Z Thu, 03 Jul 2025 08:22:53 GMT LH:csp-xss:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9568553Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Script Treemap Data
2025-07-03T08:23:06.9569531Z Thu, 03 Jul 2025 08:22:53 GMT LH:script-treemap-data:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9570470Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Site works cross-browser
2025-07-03T08:23:06.9571428Z Thu, 03 Jul 2025 08:22:53 GMT LH:pwa-cross-browser:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9572573Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Page transitions don't feel like they block on the network
2025-07-03T08:23:06.9573734Z Thu, 03 Jul 2025 08:22:53 GMT LH:pwa-page-transitions:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9574666Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Each page has a URL
2025-07-03T08:23:06.9575835Z Thu, 03 Jul 2025 08:22:53 GMT LH:pwa-each-page-has-url:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9576827Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `[accesskey]` values are unique
2025-07-03T08:23:06.9577765Z Thu, 03 Jul 2025 08:22:53 GMT LH:accesskeys:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9578744Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `[aria-*]` attributes match their roles
2025-07-03T08:23:06.9579774Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-allowed-attr:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9580857Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Values assigned to `role=""` are valid ARIA roles.
2025-07-03T08:23:06.9582172Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-allowed-role:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9583311Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `button`, `link`, and `menuitem` elements have accessible names
2025-07-03T08:23:06.9584465Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-command-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9585893Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Elements with `role="dialog"` or `role="alertdialog"` have accessible names.
2025-07-03T08:23:06.9587084Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-dialog-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9588244Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `[aria-hidden="true"]` is not present on the document `<body>`
2025-07-03T08:23:06.9589414Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-hidden-body:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9590592Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `[aria-hidden="true"]` elements do not contain focusable descendents
2025-07-03T08:23:06.9591717Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-hidden-focus:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9592722Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: ARIA input fields have accessible names
2025-07-03T08:23:06.9593793Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-input-field-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9594999Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: ARIA `meter` elements have accessible names
2025-07-03T08:23:06.9596064Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-meter-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9597155Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: ARIA `progressbar` elements have accessible names
2025-07-03T08:23:06.9598279Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-progressbar-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9599358Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `[role]`s have all required `[aria-*]` attributes
2025-07-03T08:23:06.9600435Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-required-attr:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9601949Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Elements with an ARIA `[role]` that require children to contain a specific `[role]` have all required children.
2025-07-03T08:23:06.9603577Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-required-children:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9604925Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `[role]`s are contained by their required parent element
2025-07-03T08:23:06.9606097Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-required-parent:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9607040Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `[role]` values are valid
2025-07-03T08:23:06.9607969Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-roles:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9609163Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Elements with the `role=text` attribute do not have focusable descendents.
2025-07-03T08:23:06.9610267Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-text:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9611246Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: ARIA toggle fields have accessible names
2025-07-03T08:23:06.9612348Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-toggle-field-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9613433Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: ARIA `tooltip` elements have accessible names
2025-07-03T08:23:06.9614498Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-tooltip-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9615765Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: ARIA `treeitem` elements have accessible names
2025-07-03T08:23:06.9616950Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-treeitem-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9618309Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `[aria-*]` attributes have valid values
2025-07-03T08:23:06.9619490Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-valid-attr-value:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9620556Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `[aria-*]` attributes are valid and not misspelled
2025-07-03T08:23:06.9621654Z Thu, 03 Jul 2025 08:22:53 GMT LH:aria-valid-attr:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9622624Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Buttons have an accessible name
2025-07-03T08:23:06.9623578Z Thu, 03 Jul 2025 08:22:53 GMT LH:button-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9624691Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: The page contains a heading, skip link, or landmark region
2025-07-03T08:23:06.9626065Z Thu, 03 Jul 2025 08:22:53 GMT LH:bypass:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9627223Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Background and foreground colors have a sufficient contrast ratio
2025-07-03T08:23:06.9628401Z Thu, 03 Jul 2025 08:22:53 GMT LH:color-contrast:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9629847Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `<dl>`'s contain only properly-ordered `<dt>` and `<dd>` groups, `<script>`, `<template>` or `<div>` elements.
2025-07-03T08:23:06.9631190Z Thu, 03 Jul 2025 08:22:53 GMT LH:definition-list:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9632315Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Definition list items are wrapped in `<dl>` elements
2025-07-03T08:23:06.9633364Z Thu, 03 Jul 2025 08:22:53 GMT LH:dlitem:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9634289Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Document has a `<title>` element
2025-07-03T08:23:06.9635440Z Thu, 03 Jul 2025 08:22:53 GMT LH:document-title:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9636562Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `[id]` attributes on active, focusable elements are unique
2025-07-03T08:23:06.9637684Z Thu, 03 Jul 2025 08:22:53 GMT LH:duplicate-id-active:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9638880Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: ARIA IDs are unique
2025-07-03T08:23:06.9639832Z Thu, 03 Jul 2025 08:22:53 GMT LH:duplicate-id-aria:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9640818Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: All heading elements contain content.
2025-07-03T08:23:06.9641814Z Thu, 03 Jul 2025 08:22:53 GMT LH:empty-heading:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9642782Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: No form fields have multiple labels
2025-07-03T08:23:06.9643864Z Thu, 03 Jul 2025 08:22:53 GMT LH:form-field-multiple-labels:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9645204Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `<frame>` or `<iframe>` elements have a title
2025-07-03T08:23:06.9646170Z Thu, 03 Jul 2025 08:22:53 GMT LH:frame-title:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9647268Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Heading elements appear in a sequentially-descending order
2025-07-03T08:23:06.9648320Z Thu, 03 Jul 2025 08:22:53 GMT LH:heading-order:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9649238Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `<html>` element has a `[lang]` attribute
2025-07-03T08:23:06.9650171Z Thu, 03 Jul 2025 08:22:53 GMT LH:html-has-lang:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9651223Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `<html>` element has a valid value for its `[lang]` attribute
2025-07-03T08:23:06.9652281Z Thu, 03 Jul 2025 08:22:53 GMT LH:html-lang-valid:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9653797Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `<html>` element has an `[xml:lang]` attribute with the same base language as the `[lang]` attribute.
2025-07-03T08:23:06.9655255Z Thu, 03 Jul 2025 08:22:53 GMT LH:html-xml-lang-mismatch:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9656259Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Identical links have the same purpose.
2025-07-03T08:23:06.9657348Z Thu, 03 Jul 2025 08:22:53 GMT LH:identical-links-same-purpose:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9658402Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Image elements have `[alt]` attributes
2025-07-03T08:23:06.9659326Z Thu, 03 Jul 2025 08:22:53 GMT LH:image-alt:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9660422Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Image elements do not have `[alt]` attributes that are redundant text.
2025-07-03T08:23:06.9661568Z Thu, 03 Jul 2025 08:22:53 GMT LH:image-redundant-alt:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9662550Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Input buttons have discernible text.
2025-07-03T08:23:06.9663558Z Thu, 03 Jul 2025 08:22:53 GMT LH:input-button-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9664600Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `<input type="image">` elements have `[alt]` text
2025-07-03T08:23:06.9665797Z Thu, 03 Jul 2025 08:22:53 GMT LH:input-image-alt:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9666934Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Elements with visible text labels have matching accessible names.
2025-07-03T08:23:06.9668145Z Thu, 03 Jul 2025 08:22:53 GMT LH:label-content-name-mismatch:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9669160Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Form elements have associated labels
2025-07-03T08:23:06.9670045Z Thu, 03 Jul 2025 08:22:53 GMT LH:label:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9670900Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Document has a main landmark.
2025-07-03T08:23:06.9671852Z Thu, 03 Jul 2025 08:22:53 GMT LH:landmark-one-main:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9672950Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Links have a discernible name
2025-07-03T08:23:06.9673832Z Thu, 03 Jul 2025 08:22:53 GMT LH:link-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9674979Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Links are distinguishable without relying on color.
2025-07-03T08:23:06.9676058Z Thu, 03 Jul 2025 08:22:53 GMT LH:link-in-text-block:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9677450Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Lists contain only `<li>` elements and script supporting elements (`<script>` and `<template>`).
2025-07-03T08:23:06.9678628Z Thu, 03 Jul 2025 08:22:53 GMT LH:list:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9679801Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: List items (`<li>`) are contained within `<ul>`, `<ol>` or `<menu>` parent elements
2025-07-03T08:23:06.9680946Z Thu, 03 Jul 2025 08:22:53 GMT LH:listitem:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9682038Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: The document does not use `<meta http-equiv="refresh">`
2025-07-03T08:23:06.9683071Z Thu, 03 Jul 2025 08:22:53 GMT LH:meta-refresh:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9684569Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `[user-scalable="no"]` is not used in the `<meta name="viewport">` element and the `[maximum-scale]` attribute is not less than 5.
2025-07-03T08:23:06.9686060Z Thu, 03 Jul 2025 08:22:53 GMT LH:meta-viewport:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9687043Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `<object>` elements have alternate text
2025-07-03T08:23:06.9688166Z Thu, 03 Jul 2025 08:22:53 GMT LH:object-alt:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9689190Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Select elements have associated label elements.
2025-07-03T08:23:06.9690211Z Thu, 03 Jul 2025 08:22:53 GMT LH:select-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9691100Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Skip links are focusable.
2025-07-03T08:23:06.9691980Z Thu, 03 Jul 2025 08:22:53 GMT LH:skip-link:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9693001Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: No element has a `[tabindex]` value greater than 0
2025-07-03T08:23:06.9694024Z Thu, 03 Jul 2025 08:22:53 GMT LH:tabindex:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9695317Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Tables have different content in the summary attribute and `<caption>`.
2025-07-03T08:23:06.9696532Z Thu, 03 Jul 2025 08:22:53 GMT LH:table-duplicate-name:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9697888Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Tables use `<caption>` instead of cells with the `[colspan]` attribute to indicate a caption.
2025-07-03T08:23:06.9699161Z Thu, 03 Jul 2025 08:22:53 GMT LH:table-fake-caption:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9700240Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Touch targets have sufficient size and spacing.
2025-07-03T08:23:06.9701262Z Thu, 03 Jul 2025 08:22:53 GMT LH:target-size:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9702290Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `<td>` elements in a large `<table>` have one or more table headers.
2025-07-03T08:23:06.9703359Z Thu, 03 Jul 2025 08:22:53 GMT LH:td-has-header:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9704778Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Cells in a `<table>` element that use the `[headers]` attribute refer to table cells within the same table.
2025-07-03T08:23:06.9706243Z Thu, 03 Jul 2025 08:22:53 GMT LH:td-headers-attr:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9707636Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `<th>` elements and elements with `[role="columnheader"/"rowheader"]` have data cells they describe.
2025-07-03T08:23:06.9709096Z Thu, 03 Jul 2025 08:22:53 GMT LH:th-has-data-cells:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9710094Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `[lang]` attributes have a valid value
2025-07-03T08:23:06.9711060Z Thu, 03 Jul 2025 08:22:53 GMT LH:valid-lang:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9712228Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: `<video>` elements contain a `<track>` element with `[kind="captions"]`
2025-07-03T08:23:06.9713387Z Thu, 03 Jul 2025 08:22:53 GMT LH:video-caption:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9714385Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Custom controls have associated labels
2025-07-03T08:23:06.9715611Z Thu, 03 Jul 2025 08:22:53 GMT LH:custom-controls-labels:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9716597Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Custom controls have ARIA roles
2025-07-03T08:23:06.9717624Z Thu, 03 Jul 2025 08:22:53 GMT LH:custom-controls-roles:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9718761Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: User focus is not accidentally trapped in a region
2025-07-03T08:23:06.9719791Z Thu, 03 Jul 2025 08:22:53 GMT LH:focus-traps:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9720793Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Interactive controls are keyboard focusable
2025-07-03T08:23:06.9721857Z Thu, 03 Jul 2025 08:22:53 GMT LH:focusable-controls:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9723156Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Interactive elements indicate their purpose and state
2025-07-03T08:23:06.9724417Z Thu, 03 Jul 2025 08:22:53 GMT LH:interactive-element-affordance:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9725639Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: The page has a logical tab order
2025-07-03T08:23:06.9726679Z Thu, 03 Jul 2025 08:22:53 GMT LH:logical-tab-order:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9727842Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: The user's focus is directed to new content added to the page
2025-07-03T08:23:06.9728961Z Thu, 03 Jul 2025 08:22:53 GMT LH:managed-focus:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9730075Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Offscreen content is hidden from assistive technology
2025-07-03T08:23:06.9731269Z Thu, 03 Jul 2025 08:22:53 GMT LH:offscreen-content-hidden:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9732458Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: HTML5 landmark elements are used to improve navigation
2025-07-03T08:23:06.9733557Z Thu, 03 Jul 2025 08:22:53 GMT LH:use-landmarks:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9734576Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Visual order on the page follows DOM order
2025-07-03T08:23:06.9735991Z Thu, 03 Jul 2025 08:22:53 GMT LH:visual-order-follows-dom:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9737155Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Uses efficient cache policy on static assets
2025-07-03T08:23:06.9738281Z Thu, 03 Jul 2025 08:22:53 GMT LH:uses-long-cache-ttl:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9739318Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoids enormous network payloads
2025-07-03T08:23:06.9740379Z Thu, 03 Jul 2025 08:22:53 GMT LH:total-byte-weight:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9741357Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Defer offscreen images
2025-07-03T08:23:06.9742377Z Thu, 03 Jul 2025 08:22:53 GMT LH:offscreen-images:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9743657Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Eliminate render-blocking resources
2025-07-03T08:23:06.9744979Z Thu, 03 Jul 2025 08:22:53 GMT LH:render-blocking-resources:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9745946Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Minify CSS
2025-07-03T08:23:06.9746853Z Thu, 03 Jul 2025 08:22:53 GMT LH:unminified-css:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9747770Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Minify JavaScript
2025-07-03T08:23:06.9748803Z Thu, 03 Jul 2025 08:22:53 GMT LH:unminified-javascript:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9749805Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Reduce unused CSS
2025-07-03T08:23:06.9750773Z Thu, 03 Jul 2025 08:22:53 GMT LH:unused-css-rules:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9751723Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Reduce unused JavaScript
2025-07-03T08:23:06.9752667Z Thu, 03 Jul 2025 08:22:53 GMT LH:unused-javascript:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9753596Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Serve images in next-gen formats
2025-07-03T08:23:06.9754532Z Thu, 03 Jul 2025 08:22:53 GMT LH:modern-image-formats:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9755721Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Efficiently encode images
2025-07-03T08:23:06.9756767Z Thu, 03 Jul 2025 08:22:53 GMT LH:uses-optimized-images:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9757758Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Enable text compression
2025-07-03T08:23:06.9758993Z Thu, 03 Jul 2025 08:22:53 GMT LH:uses-text-compression:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9759997Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Properly size images
2025-07-03T08:23:06.9761045Z Thu, 03 Jul 2025 08:22:53 GMT LH:uses-responsive-images:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9762144Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Use video formats for animated content
2025-07-03T08:23:06.9763300Z Thu, 03 Jul 2025 08:22:53 GMT LH:efficient-animated-content:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9764479Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Remove duplicate modules in JavaScript bundles
2025-07-03T08:23:06.9765906Z Thu, 03 Jul 2025 08:22:53 GMT LH:duplicated-javascript:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9767044Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoid serving legacy JavaScript to modern browsers
2025-07-03T08:23:06.9768177Z Thu, 03 Jul 2025 08:22:53 GMT LH:legacy-javascript:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9769171Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Page has the HTML doctype
2025-07-03T08:23:06.9770111Z Thu, 03 Jul 2025 08:22:53 GMT LH:doctype:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9771041Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Properly defines charset
2025-07-03T08:23:06.9771988Z Thu, 03 Jul 2025 08:22:53 GMT LH:charset:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9772931Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoids an excessive DOM size
2025-07-03T08:23:06.9773882Z Thu, 03 Jul 2025 08:22:53 GMT LH:dom-size:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9775258Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoids requesting the geolocation permission on page load
2025-07-03T08:23:06.9776499Z Thu, 03 Jul 2025 08:22:53 GMT LH:geolocation-on-start:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9777666Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: No issues in the `Issues` panel in Chrome Devtools
2025-07-03T08:23:06.9778791Z Thu, 03 Jul 2025 08:22:53 GMT LH:inspector-issues:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9779972Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoids `document.write()`
2025-07-03T08:23:06.9781005Z Thu, 03 Jul 2025 08:22:53 GMT LH:no-document-write:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9782050Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Detected JavaScript libraries
2025-07-03T08:23:06.9783048Z Thu, 03 Jul 2025 08:22:53 GMT LH:js-libraries:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9784228Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Avoids requesting the notification permission on page load
2025-07-03T08:23:06.9785744Z Thu, 03 Jul 2025 08:22:53 GMT LH:notification-on-start:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9786856Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Allows users to paste into input fields
2025-07-03T08:23:06.9788001Z Thu, 03 Jul 2025 08:22:53 GMT LH:paste-preventing-inputs:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9788934Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Use HTTP/2
2025-07-03T08:23:06.9789849Z Thu, 03 Jul 2025 08:22:53 GMT LH:uses-http2:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9790985Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Uses passive listeners to improve scrolling performance
2025-07-03T08:23:06.9792265Z Thu, 03 Jul 2025 08:22:53 GMT LH:uses-passive-event-listeners:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9793342Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Document has a meta description
2025-07-03T08:23:06.9794382Z Thu, 03 Jul 2025 08:22:53 GMT LH:meta-description:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9795572Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Page has successful HTTP status code
2025-07-03T08:23:06.9796840Z Thu, 03 Jul 2025 08:22:53 GMT LH:http-status-code:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9797869Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Document uses legible font sizes
2025-07-03T08:23:06.9798839Z Thu, 03 Jul 2025 08:22:53 GMT LH:font-size:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9799784Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Links have descriptive text
2025-07-03T08:23:06.9800733Z Thu, 03 Jul 2025 08:22:53 GMT LH:link-text:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9801618Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Links are crawlable
2025-07-03T08:23:06.9802617Z Thu, 03 Jul 2025 08:22:53 GMT LH:crawlable-anchors:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9803947Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Page isn’t blocked from indexing
2025-07-03T08:23:06.9805255Z Thu, 03 Jul 2025 08:22:53 GMT LH:is-crawlable:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9806187Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: robots.txt is valid
2025-07-03T08:23:06.9807114Z Thu, 03 Jul 2025 08:22:53 GMT LH:robots-txt:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9808124Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Tap targets are sized appropriately
2025-07-03T08:23:06.9809138Z Thu, 03 Jul 2025 08:22:53 GMT LH:tap-targets:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9810100Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Document has a valid `hreflang`
2025-07-03T08:23:06.9811074Z Thu, 03 Jul 2025 08:22:53 GMT LH:hreflang:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9811990Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Document avoids plugins
2025-07-03T08:23:06.9812916Z Thu, 03 Jul 2025 08:22:53 GMT LH:plugins:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9813896Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Document has a valid `rel=canonical`
2025-07-03T08:23:06.9815052Z Thu, 03 Jul 2025 08:22:53 GMT LH:canonical:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9815990Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Structured data is valid
2025-07-03T08:23:06.9817178Z Thu, 03 Jul 2025 08:22:53 GMT LH:structured-data:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9818336Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Auditing: Page didn't prevent back/forward cache restoration
2025-07-03T08:23:06.9819395Z Thu, 03 Jul 2025 08:22:53 GMT LH:bf-cache:warn Caught exception: CHROME_INTERSTITIAL_ERROR
2025-07-03T08:23:06.9820229Z Thu, 03 Jul 2025 08:22:53 GMT LH:status Generating results...
2025-07-03T08:23:06.9821023Z Thu, 03 Jul 2025 08:22:53 GMT LH:ChromeLauncher Killing Chrome instance 2128
2025-07-03T08:23:06.9822679Z Runtime error encountered: Chrome prevented page load with an interstitial. Make sure you are testing the correct URL and that the server is properly responding to all requests.
2025-07-03T08:23:06.9847730Z ##[error]LHCI 'collect' has encountered a problem.
2025-07-03T08:23:07.0077591Z Post job cleanup.
2025-07-03T08:23:07.1037483Z [command]/usr/bin/git version
2025-07-03T08:23:07.1079094Z git version 2.49.0
2025-07-03T08:23:07.1134041Z Temporarily overriding HOME='/home/runner/work/_temp/609831c5-fa9d-4379-afc0-8c93d4a78e54' before making global git config changes
2025-07-03T08:23:07.1136277Z Adding repository directory to the temporary git global config as a safe directory
2025-07-03T08:23:07.1150496Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/RMS/RMS
2025-07-03T08:23:07.1188429Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-07-03T08:23:07.1224123Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-07-03T08:23:07.1458781Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-07-03T08:23:07.1481964Z http.https://github.com/.extraheader
2025-07-03T08:23:07.1496562Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
2025-07-03T08:23:07.1530207Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-07-03T08:23:07.1865938Z Cleaning up orphan processes