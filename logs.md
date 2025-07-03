2025-07-03T08:13:01.6974101Z ##[debug]Starting: build-and-lighthouse
2025-07-03T08:13:01.7026808Z ##[debug]Cleaning runner temp folder: /home/runner/work/_temp
2025-07-03T08:13:01.7261607Z ##[debug]Starting: Set up job
2025-07-03T08:13:01.7262811Z Current runner version: '2.325.0'
2025-07-03T08:13:01.7285976Z ##[group]Runner Image Provisioner
2025-07-03T08:13:01.7286980Z Hosted Compute Agent
2025-07-03T08:13:01.7287581Z Version: 20250620.352
2025-07-03T08:13:01.7288221Z Commit: f262f3aba23b10ea191b2a62bdee1ca4c3d344da
2025-07-03T08:13:01.7289033Z Build Date: 2025-06-20T19:27:17Z
2025-07-03T08:13:01.7289969Z ##[endgroup]
2025-07-03T08:13:01.7290535Z ##[group]Operating System
2025-07-03T08:13:01.7291074Z Ubuntu
2025-07-03T08:13:01.7291635Z 24.04.2
2025-07-03T08:13:01.7292073Z LTS
2025-07-03T08:13:01.7292555Z ##[endgroup]
2025-07-03T08:13:01.7293095Z ##[group]Runner Image
2025-07-03T08:13:01.7293703Z Image: ubuntu-24.04
2025-07-03T08:13:01.7294217Z Version: 20250622.1.0
2025-07-03T08:13:01.7295302Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20250622.1/images/ubuntu/Ubuntu2404-Readme.md
2025-07-03T08:13:01.7297015Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20250622.1
2025-07-03T08:13:01.7298023Z ##[endgroup]
2025-07-03T08:13:01.7299121Z ##[group]GITHUB_TOKEN Permissions
2025-07-03T08:13:01.7301404Z Contents: read
2025-07-03T08:13:01.7301957Z Metadata: read
2025-07-03T08:13:01.7302526Z Packages: read
2025-07-03T08:13:01.7303051Z ##[endgroup]
2025-07-03T08:13:01.7306139Z Secret source: Actions
2025-07-03T08:13:01.7306874Z ##[debug]Primary repository: NtFelix/RMS
2025-07-03T08:13:01.7307676Z Prepare workflow directory
2025-07-03T08:13:01.7383164Z ##[debug]Creating pipeline directory: '/home/runner/work/RMS'
2025-07-03T08:13:01.7388573Z ##[debug]Creating workspace directory: '/home/runner/work/RMS/RMS'
2025-07-03T08:13:01.7391477Z ##[debug]Update context data
2025-07-03T08:13:01.7397126Z ##[debug]Evaluating job-level environment variables
2025-07-03T08:13:01.7727614Z ##[debug]Evaluating job container
2025-07-03T08:13:01.7732875Z ##[debug]Evaluating job service containers
2025-07-03T08:13:01.7736530Z ##[debug]Evaluating job defaults
2025-07-03T08:13:01.7774295Z Prepare all required actions
2025-07-03T08:13:01.7830961Z Getting action download info
2025-07-03T08:13:02.1758566Z ##[group]Download immutable action package 'actions/checkout@v4'
2025-07-03T08:13:02.1759837Z Version: 4.2.2
2025-07-03T08:13:02.1760922Z Digest: sha256:ccb2698953eaebd21c7bf6268a94f9c26518a7e38e27e0b83c1fe1ad049819b1
2025-07-03T08:13:02.1762283Z Source commit SHA: 11bd71901bbe5b1630ceea73d27597364c9af683
2025-07-03T08:13:02.1763020Z ##[endgroup]
2025-07-03T08:13:02.1789147Z ##[debug]Copied action archive '/opt/actionarchivecache/actions_checkout/11bd71901bbe5b1630ceea73d27597364c9af683.tar.gz' to '/home/runner/work/_actions/_temp_67324eea-0082-43ac-a7a4-00448e249416/be2f0f2d-7c33-44d3-a902-c5ae7529fdf7.tar.gz'
2025-07-03T08:13:02.2459008Z ##[debug]Unwrap 'actions-checkout-11bd719' to '/home/runner/work/_actions/actions/checkout/v4'
2025-07-03T08:13:02.2603636Z ##[debug]Archive '/home/runner/work/_actions/_temp_67324eea-0082-43ac-a7a4-00448e249416/be2f0f2d-7c33-44d3-a902-c5ae7529fdf7.tar.gz' has been unzipped into '/home/runner/work/_actions/actions/checkout/v4'.
2025-07-03T08:13:02.2712287Z ##[group]Download immutable action package 'actions/setup-node@v4'
2025-07-03T08:13:02.2713294Z Version: 4.4.0
2025-07-03T08:13:02.2714137Z Digest: sha256:9427cefe82346e992fb5b949e3569b39d537ae41aa3086483b14eceebfc16bc1
2025-07-03T08:13:02.2715218Z Source commit SHA: 49933ea5288caeca8642d1e84afbd3f7d6820020
2025-07-03T08:13:02.2716012Z ##[endgroup]
2025-07-03T08:13:02.2776593Z ##[debug]Copied action archive '/opt/actionarchivecache/actions_setup-node/49933ea5288caeca8642d1e84afbd3f7d6820020.tar.gz' to '/home/runner/work/_actions/_temp_6bf5ff59-ad4b-486d-a8a7-708d29d2003a/45e694bf-c9db-4582-8c62-1b58e6ead9a5.tar.gz'
2025-07-03T08:13:02.3417147Z ##[debug]Unwrap 'actions-setup-node-49933ea' to '/home/runner/work/_actions/actions/setup-node/v4'
2025-07-03T08:13:02.3672026Z ##[debug]Archive '/home/runner/work/_actions/_temp_6bf5ff59-ad4b-486d-a8a7-708d29d2003a/45e694bf-c9db-4582-8c62-1b58e6ead9a5.tar.gz' has been unzipped into '/home/runner/work/_actions/actions/setup-node/v4'.
2025-07-03T08:13:02.3823057Z Download action repository 'jakejarvis/lighthouse-action@v0.3.2' (SHA:a3bcc9973b3ce65beff316b3cac53b92e58dcc12)
2025-07-03T08:13:02.7705913Z ##[debug]Download 'https://api.github.com/repos/jakejarvis/lighthouse-action/tarball/a3bcc9973b3ce65beff316b3cac53b92e58dcc12' to '/home/runner/work/_actions/_temp_c97a813a-164b-4afe-9d7d-e6b6046e04ee/ede20586-1413-4bf1-84ff-b1c1b396d475.tar.gz'
2025-07-03T08:13:02.7865392Z ##[debug]Unwrap 'jakejarvis-lighthouse-action-a3bcc99' to '/home/runner/work/_actions/jakejarvis/lighthouse-action/v0.3.2'
2025-07-03T08:13:02.7894375Z ##[debug]Archive '/home/runner/work/_actions/_temp_c97a813a-164b-4afe-9d7d-e6b6046e04ee/ede20586-1413-4bf1-84ff-b1c1b396d475.tar.gz' has been unzipped into '/home/runner/work/_actions/jakejarvis/lighthouse-action/v0.3.2'.
2025-07-03T08:13:02.7909871Z ##[group]Download immutable action package 'actions/upload-artifact@v4'
2025-07-03T08:13:02.7910743Z Version: 4.6.2
2025-07-03T08:13:02.7911534Z Digest: sha256:290722aa3281d5caf23d0acdc3dbeb3424786a1a01a9cc97e72f147225e37c38
2025-07-03T08:13:02.7912534Z Source commit SHA: ea165f8d65b6e75b540449e92b4886f43607fa02
2025-07-03T08:13:02.7913272Z ##[endgroup]
2025-07-03T08:13:02.7983300Z ##[debug]Copied action archive '/opt/actionarchivecache/actions_upload-artifact/ea165f8d65b6e75b540449e92b4886f43607fa02.tar.gz' to '/home/runner/work/_actions/_temp_66228ebf-4600-43e7-a515-7f4a5b331e39/e9997c9e-aa29-4f55-a5ce-522a76e37af2.tar.gz'
2025-07-03T08:13:02.8784808Z ##[debug]Unwrap 'actions-upload-artifact-ea165f8' to '/home/runner/work/_actions/actions/upload-artifact/v4'
2025-07-03T08:13:02.9134487Z ##[debug]Archive '/home/runner/work/_actions/_temp_66228ebf-4600-43e7-a515-7f4a5b331e39/e9997c9e-aa29-4f55-a5ce-522a76e37af2.tar.gz' has been unzipped into '/home/runner/work/_actions/actions/upload-artifact/v4'.
2025-07-03T08:13:02.9219943Z ##[debug]action.yml for action: '/home/runner/work/_actions/actions/checkout/v4/action.yml'.
2025-07-03T08:13:02.9819058Z ##[debug]action.yml for action: '/home/runner/work/_actions/actions/setup-node/v4/action.yml'.
2025-07-03T08:13:02.9883465Z ##[debug]Dockerfile for action: '/home/runner/work/_actions/jakejarvis/lighthouse-action/v0.3.2/Dockerfile'.
2025-07-03T08:13:02.9894462Z ##[debug]action.yml for action: '/home/runner/work/_actions/actions/upload-artifact/v4/action.yml'.
2025-07-03T08:13:03.0014791Z ##[debug]Set step '__actions_checkout' display name to: 'Checkout Repository'
2025-07-03T08:13:03.0017881Z ##[debug]Set step '__actions_setup-node' display name to: 'Setup Node.js'
2025-07-03T08:13:03.0019957Z ##[debug]Set step '__run' display name to: 'Install Dependencies'
2025-07-03T08:13:03.0022643Z ##[debug]Set step '__run_2' display name to: 'Build Next.js'
2025-07-03T08:13:03.0024488Z ##[debug]Set step '__run_3' display name to: 'Serve static files'
2025-07-03T08:13:03.0026727Z ##[debug]Set step '__jakejarvis_lighthouse-action' display name to: 'Run Lighthouse Performance Audit'
2025-07-03T08:13:03.0028956Z ##[debug]Set step '__actions_upload-artifact' display name to: 'Upload Lighthouse Reports'
2025-07-03T08:13:03.0030583Z Complete job name: build-and-lighthouse
2025-07-03T08:13:03.0074358Z ##[debug]Collect running processes for tracking orphan processes.
2025-07-03T08:13:03.0267969Z ##[debug]Finishing: Set up job
2025-07-03T08:13:03.0389615Z ##[debug]Evaluating condition for step: 'Build jakejarvis/lighthouse-action@v0.3.2'
2025-07-03T08:13:03.0427377Z ##[debug]Evaluating: success()
2025-07-03T08:13:03.0433053Z ##[debug]Evaluating success:
2025-07-03T08:13:03.0449054Z ##[debug]=> true
2025-07-03T08:13:03.0455520Z ##[debug]Result: true
2025-07-03T08:13:03.0478617Z ##[debug]Starting: Build jakejarvis/lighthouse-action@v0.3.2
2025-07-03T08:13:03.0500816Z ##[group]Build container for action use: '/home/runner/work/_actions/jakejarvis/lighthouse-action/v0.3.2/Dockerfile'.
2025-07-03T08:13:03.0547607Z ##[command]/usr/bin/docker build -t d074b8:e6686fa9c9574dabb294548d56d983b7 -f "/home/runner/work/_actions/jakejarvis/lighthouse-action/v0.3.2/Dockerfile" "/home/runner/work/_actions/jakejarvis/lighthouse-action/v0.3.2"
2025-07-03T08:13:03.5879809Z #0 building with "default" instance using docker driver
2025-07-03T08:13:03.5880926Z 
2025-07-03T08:13:03.5881602Z #1 [internal] load build definition from Dockerfile
2025-07-03T08:13:03.5882515Z #1 transferring dockerfile: 834B done
2025-07-03T08:13:03.5883164Z #1 DONE 0.0s
2025-07-03T08:13:03.5883709Z 
2025-07-03T08:13:03.5884477Z #2 [auth] jakejarvis/chrome-headless:pull token for registry-1.docker.io
2025-07-03T08:13:03.7350137Z #2 DONE 0.0s
2025-07-03T08:13:03.7445584Z 
2025-07-03T08:13:03.7446982Z #3 [internal] load metadata for docker.io/jakejarvis/chrome-headless:latest
2025-07-03T08:13:04.0151276Z #3 DONE 0.4s
2025-07-03T08:13:04.0790229Z 
2025-07-03T08:13:04.0796095Z #4 [internal] load .dockerignore
2025-07-03T08:13:04.0799132Z #4 transferring context: 175B done
2025-07-03T08:13:04.0802239Z #4 DONE 0.0s
2025-07-03T08:13:04.0804024Z 
2025-07-03T08:13:04.0804721Z #5 [internal] load build context
2025-07-03T08:13:04.0805969Z #5 transferring context: 2.60kB done
2025-07-03T08:13:04.0807189Z #5 DONE 0.0s
2025-07-03T08:13:04.0807762Z 
2025-07-03T08:13:04.0809448Z #6 [1/3] FROM docker.io/jakejarvis/chrome-headless:latest@sha256:ec66d77377b7918d2807680e8c00875fdafe655a6778877c3cb7a9f27935a368
2025-07-03T08:13:04.0813051Z #6 resolve docker.io/jakejarvis/chrome-headless:latest@sha256:ec66d77377b7918d2807680e8c00875fdafe655a6778877c3cb7a9f27935a368 0.0s done
2025-07-03T08:13:04.0815761Z #6 sha256:ec66d77377b7918d2807680e8c00875fdafe655a6778877c3cb7a9f27935a368 1.79kB / 1.79kB done
2025-07-03T08:13:04.0818354Z #6 sha256:60a69d75fccb7bac2b8e27a6dbbb1124276384bf383f6ea778b6f34f04eb4ece 0B / 35.09MB 0.1s
2025-07-03T08:13:04.0822245Z #6 sha256:314092a194210e97832505d34b04794a70417a6a3a50e1128e98b575fb8df4a8 9.84kB / 9.84kB done
2025-07-03T08:13:04.0825911Z #6 sha256:b5887238bf65fc2f40fdd004509b96300faa112cc64eb2865a09895474269ee7 4.19MB / 22.53MB 0.1s
2025-07-03T08:13:04.0829840Z #6 sha256:9f6e2724e654cd5458fbd864a8ba5bbdc90f6a43fc3e0ce5129750a02689b9d0 4.17kB / 4.17kB 0.1s done
2025-07-03T08:13:04.1886993Z #6 sha256:60a69d75fccb7bac2b8e27a6dbbb1124276384bf383f6ea778b6f34f04eb4ece 12.58MB / 35.09MB 0.2s
2025-07-03T08:13:04.1890633Z #6 sha256:b5887238bf65fc2f40fdd004509b96300faa112cc64eb2865a09895474269ee7 22.53MB / 22.53MB 0.2s
2025-07-03T08:13:04.1893360Z #6 sha256:a4cf4ce2967efea5be3ba9f99b3a9c7c3121228727b4ce0c5f40cfcb3eca9123 0B / 2.83MB 0.2s
2025-07-03T08:13:04.3449569Z #6 sha256:60a69d75fccb7bac2b8e27a6dbbb1124276384bf383f6ea778b6f34f04eb4ece 31.46MB / 35.09MB 0.3s
2025-07-03T08:13:04.3453561Z #6 sha256:b5887238bf65fc2f40fdd004509b96300faa112cc64eb2865a09895474269ee7 22.53MB / 22.53MB 0.2s done
2025-07-03T08:13:04.3458822Z #6 extracting sha256:b5887238bf65fc2f40fdd004509b96300faa112cc64eb2865a09895474269ee7 0.1s
2025-07-03T08:13:04.3462112Z #6 sha256:7db16c57bdcfaf97c2149f76c5ae1e9878b0f58942eb136763878b75c3bd26e1 293B / 293B 0.3s done
2025-07-03T08:13:04.3467142Z #6 sha256:55533aad29c2289e6fa907b2c314de533a181df091d06e443d80b28f17c70e1c 0B / 8.75MB 0.3s
2025-07-03T08:13:04.5197803Z #6 sha256:60a69d75fccb7bac2b8e27a6dbbb1124276384bf383f6ea778b6f34f04eb4ece 35.09MB / 35.09MB 0.3s done
2025-07-03T08:13:04.5205921Z #6 sha256:55533aad29c2289e6fa907b2c314de533a181df091d06e443d80b28f17c70e1c 8.75MB / 8.75MB 0.4s done
2025-07-03T08:13:04.5221094Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 18.87MB / 149.27MB 0.5s
2025-07-03T08:13:04.5923966Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 49.28MB / 149.27MB 0.6s
2025-07-03T08:13:04.7406775Z #6 sha256:a4cf4ce2967efea5be3ba9f99b3a9c7c3121228727b4ce0c5f40cfcb3eca9123 1.47MB / 2.83MB 0.7s
2025-07-03T08:13:04.7415113Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 61.87MB / 149.27MB 0.7s
2025-07-03T08:13:04.8404643Z #6 sha256:a4cf4ce2967efea5be3ba9f99b3a9c7c3121228727b4ce0c5f40cfcb3eca9123 2.83MB / 2.83MB 0.7s done
2025-07-03T08:13:04.8412593Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 79.12MB / 149.27MB 0.8s
2025-07-03T08:13:04.9806712Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 128.97MB / 149.27MB 1.0s
2025-07-03T08:13:05.0871085Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 149.27MB / 149.27MB 1.1s
2025-07-03T08:13:05.5523253Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 149.27MB / 149.27MB 1.5s done
2025-07-03T08:13:05.9100137Z #6 extracting sha256:b5887238bf65fc2f40fdd004509b96300faa112cc64eb2865a09895474269ee7 1.7s done
2025-07-03T08:13:05.9101466Z #6 extracting sha256:9f6e2724e654cd5458fbd864a8ba5bbdc90f6a43fc3e0ce5129750a02689b9d0
2025-07-03T08:13:06.0606939Z #6 extracting sha256:9f6e2724e654cd5458fbd864a8ba5bbdc90f6a43fc3e0ce5129750a02689b9d0 done
2025-07-03T08:13:07.4878226Z #6 extracting sha256:60a69d75fccb7bac2b8e27a6dbbb1124276384bf383f6ea778b6f34f04eb4ece
2025-07-03T08:13:09.4080964Z #6 extracting sha256:60a69d75fccb7bac2b8e27a6dbbb1124276384bf383f6ea778b6f34f04eb4ece 1.8s done
2025-07-03T08:13:09.6186783Z #6 extracting sha256:a4cf4ce2967efea5be3ba9f99b3a9c7c3121228727b4ce0c5f40cfcb3eca9123
2025-07-03T08:13:09.7202170Z #6 extracting sha256:a4cf4ce2967efea5be3ba9f99b3a9c7c3121228727b4ce0c5f40cfcb3eca9123 0.1s done
2025-07-03T08:13:09.7206122Z #6 extracting sha256:7db16c57bdcfaf97c2149f76c5ae1e9878b0f58942eb136763878b75c3bd26e1
2025-07-03T08:13:09.8412907Z #6 extracting sha256:7db16c57bdcfaf97c2149f76c5ae1e9878b0f58942eb136763878b75c3bd26e1 done
2025-07-03T08:13:09.8414006Z #6 extracting sha256:55533aad29c2289e6fa907b2c314de533a181df091d06e443d80b28f17c70e1c 0.1s
2025-07-03T08:13:10.1126929Z #6 extracting sha256:55533aad29c2289e6fa907b2c314de533a181df091d06e443d80b28f17c70e1c 0.3s done
2025-07-03T08:13:10.1128778Z #6 extracting sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe
2025-07-03T08:13:14.0190675Z #6 extracting sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 3.8s done
2025-07-03T08:13:15.5198227Z #6 DONE 11.6s
2025-07-03T08:13:15.6715015Z 
2025-07-03T08:13:15.6715988Z #7 [2/3] RUN npm install -g lighthouse
2025-07-03T08:13:26.1129740Z #7 10.59 /usr/local/bin/lighthouse -> /usr/local/lib/node_modules/lighthouse/cli/index.js
2025-07-03T08:13:26.3373205Z #7 10.59 /usr/local/bin/chrome-debug -> /usr/local/lib/node_modules/lighthouse/core/scripts/manual-chrome-launcher.js
2025-07-03T08:13:26.3386372Z #7 10.59 /usr/local/bin/smokehouse -> /usr/local/lib/node_modules/lighthouse/cli/test/smokehouse/frontends/smokehouse-bin.js
2025-07-03T08:13:26.3387727Z #7 10.64 npm WARN notsup Unsupported engine for lighthouse@12.7.1: wanted: {"node":">=18.20"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:13:26.3388804Z #7 10.64 npm WARN notsup Not compatible with your version of node/npm: lighthouse@12.7.1
2025-07-03T08:13:26.3390066Z #7 10.64 npm WARN notsup Unsupported engine for configstore@7.0.0: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:13:26.3391102Z #7 10.64 npm WARN notsup Not compatible with your version of node/npm: configstore@7.0.0
2025-07-03T08:13:26.3392156Z #7 10.64 npm WARN notsup Unsupported engine for puppeteer-core@24.11.2: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:13:26.3393775Z #7 10.64 npm WARN notsup Not compatible with your version of node/npm: puppeteer-core@24.11.2
2025-07-03T08:13:26.3394872Z #7 10.65 npm WARN notsup Unsupported engine for @sentry/node@9.34.0: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:13:26.3395906Z #7 10.65 npm WARN notsup Not compatible with your version of node/npm: @sentry/node@9.34.0
2025-07-03T08:13:26.3396947Z #7 10.65 npm WARN notsup Unsupported engine for minimatch@9.0.5: wanted: {"node":">=16 || 14 >=14.17"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:13:26.3398267Z #7 10.65 npm WARN notsup Not compatible with your version of node/npm: minimatch@9.0.5
2025-07-03T08:13:26.3399566Z #7 10.65 npm WARN notsup Unsupported engine for @sentry/core@9.34.0: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:13:26.3400670Z #7 10.65 npm WARN notsup Not compatible with your version of node/npm: @sentry/core@9.34.0
2025-07-03T08:13:26.3401832Z #7 10.66 npm WARN notsup Unsupported engine for @sentry/opentelemetry@9.34.0: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:13:26.3402996Z #7 10.66 npm WARN notsup Not compatible with your version of node/npm: @sentry/opentelemetry@9.34.0
2025-07-03T08:13:26.3404118Z #7 10.66 npm WARN notsup Unsupported engine for dot-prop@9.0.0: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:13:26.3405141Z #7 10.66 npm WARN notsup Not compatible with your version of node/npm: dot-prop@9.0.0
2025-07-03T08:13:26.3406160Z #7 10.66 npm WARN notsup Unsupported engine for type-fest@4.41.0: wanted: {"node":">=16"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:13:26.3407139Z #7 10.66 npm WARN notsup Not compatible with your version of node/npm: type-fest@4.41.0
2025-07-03T08:13:26.3408216Z #7 10.66 npm WARN notsup Unsupported engine for @puppeteer/browsers@2.10.5: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:13:26.3440490Z #7 10.66 npm WARN notsup Not compatible with your version of node/npm: @puppeteer/browsers@2.10.5
2025-07-03T08:13:26.3441253Z #7 10.66 
2025-07-03T08:13:26.3441545Z #7 10.67 + lighthouse@12.7.1
2025-07-03T08:13:26.3441996Z #7 10.67 added 202 packages from 265 contributors in 10.138s
2025-07-03T08:13:27.0603184Z #7 DONE 11.5s
2025-07-03T08:13:27.2332087Z 
2025-07-03T08:13:27.2332685Z #8 [3/3] ADD entrypoint.sh /entrypoint.sh
2025-07-03T08:13:27.2333223Z #8 DONE 0.0s
2025-07-03T08:13:27.2333412Z 
2025-07-03T08:13:27.2333554Z #9 exporting to image
2025-07-03T08:13:27.2333934Z #9 exporting layers
2025-07-03T08:13:30.5811915Z #9 exporting layers 3.5s done
2025-07-03T08:13:30.6071239Z #9 writing image sha256:52e0843e030ba5ec0b9c04adbd6851907c07fd79110d7200e3db3a58c349e5ed done
2025-07-03T08:13:30.6072411Z #9 naming to docker.io/library/d074b8:e6686fa9c9574dabb294548d56d983b7 done
2025-07-03T08:13:30.6083223Z #9 DONE 3.5s
2025-07-03T08:13:30.6138860Z ##[endgroup]
2025-07-03T08:13:30.6152290Z ##[debug]Finishing: Build jakejarvis/lighthouse-action@v0.3.2
2025-07-03T08:13:30.6171054Z ##[debug]Evaluating condition for step: 'Checkout Repository'
2025-07-03T08:13:30.6176420Z ##[debug]Evaluating: success()
2025-07-03T08:13:30.6176795Z ##[debug]Evaluating success:
2025-07-03T08:13:30.6177244Z ##[debug]=> true
2025-07-03T08:13:30.6177594Z ##[debug]Result: true
2025-07-03T08:13:30.6178740Z ##[debug]Starting: Checkout Repository
2025-07-03T08:13:30.6239048Z ##[debug]Register post job cleanup for action: actions/checkout@v4
2025-07-03T08:13:30.6320850Z ##[debug]Loading inputs
2025-07-03T08:13:30.6329942Z ##[debug]Evaluating: github.repository
2025-07-03T08:13:30.6330915Z ##[debug]Evaluating Index:
2025-07-03T08:13:30.6332654Z ##[debug]..Evaluating github:
2025-07-03T08:13:30.6333550Z ##[debug]..=> Object
2025-07-03T08:13:30.6338921Z ##[debug]..Evaluating String:
2025-07-03T08:13:30.6339734Z ##[debug]..=> 'repository'
2025-07-03T08:13:30.6343631Z ##[debug]=> 'NtFelix/RMS'
2025-07-03T08:13:30.6344819Z ##[debug]Result: 'NtFelix/RMS'
2025-07-03T08:13:30.6347757Z ##[debug]Evaluating: github.token
2025-07-03T08:13:30.6348031Z ##[debug]Evaluating Index:
2025-07-03T08:13:30.6348266Z ##[debug]..Evaluating github:
2025-07-03T08:13:30.6348517Z ##[debug]..=> Object
2025-07-03T08:13:30.6348734Z ##[debug]..Evaluating String:
2025-07-03T08:13:30.6348979Z ##[debug]..=> 'token'
2025-07-03T08:13:30.6350369Z ##[debug]=> '***'
2025-07-03T08:13:30.6350719Z ##[debug]Result: '***'
2025-07-03T08:13:30.6361426Z ##[debug]Loading env
2025-07-03T08:13:30.6416225Z ##[group]Run actions/checkout@v4
2025-07-03T08:13:30.6417361Z with:
2025-07-03T08:13:30.6417683Z   repository: NtFelix/RMS
2025-07-03T08:13:30.6418290Z   token: ***
2025-07-03T08:13:30.6418593Z   ssh-strict: true
2025-07-03T08:13:30.6418916Z   ssh-user: git
2025-07-03T08:13:30.6419446Z   persist-credentials: true
2025-07-03T08:13:30.6419817Z   clean: true
2025-07-03T08:13:30.6420159Z   sparse-checkout-cone-mode: true
2025-07-03T08:13:30.6420564Z   fetch-depth: 1
2025-07-03T08:13:30.6420876Z   fetch-tags: false
2025-07-03T08:13:30.6421214Z   show-progress: true
2025-07-03T08:13:30.6421548Z   lfs: false
2025-07-03T08:13:30.6421842Z   submodules: false
2025-07-03T08:13:30.6422177Z   set-safe-directory: true
2025-07-03T08:13:30.6423120Z ##[endgroup]
2025-07-03T08:13:30.7472134Z ##[debug]GITHUB_WORKSPACE = '/home/runner/work/RMS/RMS'
2025-07-03T08:13:30.7473941Z ##[debug]qualified repository = 'NtFelix/RMS'
2025-07-03T08:13:30.7475100Z ##[debug]ref = 'refs/pull/247/merge'
2025-07-03T08:13:30.7476196Z ##[debug]commit = 'd2020afc7a3d33dccf8fc6431c58b79eca54e5e8'
2025-07-03T08:13:30.7477348Z ##[debug]clean = true
2025-07-03T08:13:30.7478088Z ##[debug]filter = undefined
2025-07-03T08:13:30.7478913Z ##[debug]fetch depth = 1
2025-07-03T08:13:30.7479897Z ##[debug]fetch tags = false
2025-07-03T08:13:30.7480771Z ##[debug]show progress = true
2025-07-03T08:13:30.7482966Z ##[debug]lfs = false
2025-07-03T08:13:30.7484851Z ##[debug]submodules = false
2025-07-03T08:13:30.7487419Z ##[debug]recursive submodules = false
2025-07-03T08:13:30.7492127Z ##[debug]GitHub Host URL = 
2025-07-03T08:13:30.7495539Z ::add-matcher::/home/runner/work/_actions/actions/checkout/v4/dist/problem-matcher.json
2025-07-03T08:13:30.7613808Z ##[debug]Added matchers: 'checkout-git'. Problem matchers scan action output for known warning or error strings and report these inline.
2025-07-03T08:13:30.7621803Z Syncing repository: NtFelix/RMS
2025-07-03T08:13:30.7623667Z ::group::Getting Git version info
2025-07-03T08:13:30.7625260Z ##[group]Getting Git version info
2025-07-03T08:13:30.7625917Z Working directory is '/home/runner/work/RMS/RMS'
2025-07-03T08:13:30.7634648Z ##[debug]Getting git version
2025-07-03T08:13:30.7635204Z [command]/usr/bin/git version
2025-07-03T08:13:30.7660323Z git version 2.49.0
2025-07-03T08:13:30.7686743Z ##[debug]0
2025-07-03T08:13:30.7698587Z ##[debug]git version 2.49.0
2025-07-03T08:13:30.7698961Z ##[debug]
2025-07-03T08:13:30.7699894Z ##[debug]Set git useragent to: git/2.49.0 (github-actions-checkout)
2025-07-03T08:13:30.7832695Z ::endgroup::
2025-07-03T08:13:30.7833701Z ##[endgroup]
2025-07-03T08:13:30.7886594Z ::add-mask::***
2025-07-03T08:13:30.7888814Z Temporarily overriding HOME='/home/runner/work/_temp/11f7afc8-9480-400c-9ed4-2e68ddc31fcf' before making global git config changes
2025-07-03T08:13:30.7890537Z Adding repository directory to the temporary git global config as a safe directory
2025-07-03T08:13:30.7891631Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/RMS/RMS
2025-07-03T08:13:30.7892831Z ##[debug]0
2025-07-03T08:13:30.7893451Z ##[debug]
2025-07-03T08:13:30.7893919Z Deleting the contents of '/home/runner/work/RMS/RMS'
2025-07-03T08:13:30.7895003Z ::group::Initializing the repository
2025-07-03T08:13:30.7895613Z ##[group]Initializing the repository
2025-07-03T08:13:30.7896196Z [command]/usr/bin/git init /home/runner/work/RMS/RMS
2025-07-03T08:13:30.7897013Z hint: Using 'master' as the name for the initial branch. This default branch name
2025-07-03T08:13:30.7897962Z hint: is subject to change. To configure the initial branch name to use in all
2025-07-03T08:13:30.7898962Z hint: of your new repositories, which will suppress this warning, call:
2025-07-03T08:13:30.7899875Z hint:
2025-07-03T08:13:30.7900330Z hint: 	git config --global init.defaultBranch <name>
2025-07-03T08:13:30.7900860Z hint:
2025-07-03T08:13:30.7901403Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
2025-07-03T08:13:30.7902371Z hint: 'development'. The just-created branch can be renamed via this command:
2025-07-03T08:13:30.7903044Z hint:
2025-07-03T08:13:30.7903714Z hint: 	git branch -m <name>
2025-07-03T08:13:30.7910252Z Initialized empty Git repository in /home/runner/work/RMS/RMS/.git/
2025-07-03T08:13:30.7911260Z ##[debug]0
2025-07-03T08:13:30.7912074Z ##[debug]Initialized empty Git repository in /home/runner/work/RMS/RMS/.git/
2025-07-03T08:13:30.7912681Z ##[debug]
2025-07-03T08:13:30.7913250Z [command]/usr/bin/git remote add origin https://github.com/NtFelix/RMS
2025-07-03T08:13:30.8051258Z ##[debug]0
2025-07-03T08:13:30.8052170Z ##[debug]
2025-07-03T08:13:30.8053641Z ::endgroup::
2025-07-03T08:13:30.8054030Z ##[endgroup]
2025-07-03T08:13:30.8054936Z ::group::Disabling automatic garbage collection
2025-07-03T08:13:30.8055493Z ##[group]Disabling automatic garbage collection
2025-07-03T08:13:30.8062252Z [command]/usr/bin/git config --local gc.auto 0
2025-07-03T08:13:30.8096592Z ##[debug]0
2025-07-03T08:13:30.8097760Z ##[debug]
2025-07-03T08:13:30.8098901Z ::endgroup::
2025-07-03T08:13:30.8099506Z ##[endgroup]
2025-07-03T08:13:30.8100639Z ::group::Setting up auth
2025-07-03T08:13:30.8101048Z ##[group]Setting up auth
2025-07-03T08:13:30.8108380Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-07-03T08:13:30.8136343Z ##[debug]1
2025-07-03T08:13:30.8137361Z ##[debug]
2025-07-03T08:13:30.8144306Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-07-03T08:13:30.8426404Z ##[debug]0
2025-07-03T08:13:30.8427746Z ##[debug]
2025-07-03T08:13:30.8433116Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-07-03T08:13:30.8461721Z ##[debug]1
2025-07-03T08:13:30.8462895Z ##[debug]
2025-07-03T08:13:30.8467810Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-07-03T08:13:30.8695236Z ##[debug]0
2025-07-03T08:13:30.8698221Z ##[debug]
2025-07-03T08:13:30.8715935Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
2025-07-03T08:13:30.8748761Z ##[debug]0
2025-07-03T08:13:30.8750996Z ##[debug]
2025-07-03T08:13:30.8759438Z ::endgroup::
2025-07-03T08:13:30.8759780Z ##[endgroup]
2025-07-03T08:13:30.8761800Z ::group::Fetching the repository
2025-07-03T08:13:30.8762295Z ##[group]Fetching the repository
2025-07-03T08:13:30.8771750Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +d2020afc7a3d33dccf8fc6431c58b79eca54e5e8:refs/remotes/pull/247/merge
2025-07-03T08:13:31.4139647Z From https://github.com/NtFelix/RMS
2025-07-03T08:13:31.4140834Z  * [new ref]         d2020afc7a3d33dccf8fc6431c58b79eca54e5e8 -> pull/247/merge
2025-07-03T08:13:31.4172656Z ##[debug]0
2025-07-03T08:13:31.4177124Z ##[debug]
2025-07-03T08:13:31.4181852Z ::endgroup::
2025-07-03T08:13:31.4182205Z ##[endgroup]
2025-07-03T08:13:31.4186527Z ::group::Determining the checkout info
2025-07-03T08:13:31.4186939Z ##[group]Determining the checkout info
2025-07-03T08:13:31.4192026Z ::endgroup::
2025-07-03T08:13:31.4192335Z ##[endgroup]
2025-07-03T08:13:31.4194045Z [command]/usr/bin/git sparse-checkout disable
2025-07-03T08:13:31.4222853Z ##[debug]0
2025-07-03T08:13:31.4223557Z ##[debug]
2025-07-03T08:13:31.4228425Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
2025-07-03T08:13:31.4256494Z ##[debug]0
2025-07-03T08:13:31.4257496Z ##[debug]
2025-07-03T08:13:31.4259068Z ::group::Checking out the ref
2025-07-03T08:13:31.4259736Z ##[group]Checking out the ref
2025-07-03T08:13:31.4264186Z [command]/usr/bin/git checkout --progress --force refs/remotes/pull/247/merge
2025-07-03T08:13:31.4451719Z Note: switching to 'refs/remotes/pull/247/merge'.
2025-07-03T08:13:31.4452147Z 
2025-07-03T08:13:31.4454776Z You are in 'detached HEAD' state. You can look around, make experimental
2025-07-03T08:13:31.4456024Z changes and commit them, and you can discard any commits you make in this
2025-07-03T08:13:31.4456887Z state without impacting any branches by switching back to a branch.
2025-07-03T08:13:31.4457294Z 
2025-07-03T08:13:31.4457585Z If you want to create a new branch to retain commits you create, you may
2025-07-03T08:13:31.4458295Z do so (now or later) by using -c with the switch command. Example:
2025-07-03T08:13:31.4458686Z 
2025-07-03T08:13:31.4458851Z   git switch -c <new-branch-name>
2025-07-03T08:13:31.4459160Z 
2025-07-03T08:13:31.4459554Z Or undo this operation with:
2025-07-03T08:13:31.4459807Z 
2025-07-03T08:13:31.4459952Z   git switch -
2025-07-03T08:13:31.4460255Z 
2025-07-03T08:13:31.4460591Z Turn off this advice by setting config variable advice.detachedHead to false
2025-07-03T08:13:31.4461079Z 
2025-07-03T08:13:31.4461630Z HEAD is now at d2020af Merge 84d6ea3f4de1a221d0cdc448ff3e73598789eb4d into 7d95cb47c526dc38811778a0145d370107811599
2025-07-03T08:13:31.4473932Z ##[debug]0
2025-07-03T08:13:31.4474447Z ##[debug]
2025-07-03T08:13:31.4474873Z ::endgroup::
2025-07-03T08:13:31.4475125Z ##[endgroup]
2025-07-03T08:13:31.4500896Z ##[debug]0
2025-07-03T08:13:31.4502193Z ##[debug]commit d2020afc7a3d33dccf8fc6431c58b79eca54e5e8
2025-07-03T08:13:31.4502767Z ##[debug]Author: Felix <felix.plant@hotmail.com>
2025-07-03T08:13:31.4503263Z ##[debug]Date:   Thu Jul 3 08:10:11 2025 +0000
2025-07-03T08:13:31.4503701Z ##[debug]
2025-07-03T08:13:31.4504381Z ##[debug]    Merge 84d6ea3f4de1a221d0cdc448ff3e73598789eb4d into 7d95cb47c526dc38811778a0145d370107811599
2025-07-03T08:13:31.4505184Z ##[debug]
2025-07-03T08:13:31.4505921Z [command]/usr/bin/git log -1 --format=%H
2025-07-03T08:13:31.4531035Z d2020afc7a3d33dccf8fc6431c58b79eca54e5e8
2025-07-03T08:13:31.4538242Z ##[debug]0
2025-07-03T08:13:31.4540253Z ##[debug]d2020afc7a3d33dccf8fc6431c58b79eca54e5e8
2025-07-03T08:13:31.4540733Z ##[debug]
2025-07-03T08:13:31.4546571Z ##[debug]Unsetting HOME override
2025-07-03T08:13:31.4562179Z ::remove-matcher owner=checkout-git::
2025-07-03T08:13:31.4576868Z ##[debug]Removed matchers: 'checkout-git'
2025-07-03T08:13:31.4631444Z ##[debug]Node Action run completed with exit code 0
2025-07-03T08:13:31.4668926Z ##[debug]Save intra-action state isPost = true
2025-07-03T08:13:31.4669700Z ##[debug]Save intra-action state setSafeDirectory = true
2025-07-03T08:13:31.4670126Z ##[debug]Save intra-action state repositoryPath = /home/runner/work/RMS/RMS
2025-07-03T08:13:31.4673673Z ##[debug]Set output commit = d2020afc7a3d33dccf8fc6431c58b79eca54e5e8
2025-07-03T08:13:31.4674483Z ##[debug]Set output ref = refs/pull/247/merge
2025-07-03T08:13:31.4676046Z ##[debug]Finishing: Checkout Repository
2025-07-03T08:13:31.4684136Z ##[debug]Evaluating condition for step: 'Setup Node.js'
2025-07-03T08:13:31.4686112Z ##[debug]Evaluating: success()
2025-07-03T08:13:31.4686461Z ##[debug]Evaluating success:
2025-07-03T08:13:31.4686984Z ##[debug]=> true
2025-07-03T08:13:31.4687297Z ##[debug]Result: true
2025-07-03T08:13:31.4687830Z ##[debug]Starting: Setup Node.js
2025-07-03T08:13:31.4716991Z ##[debug]Register post job cleanup for action: actions/setup-node@v4
2025-07-03T08:13:31.4730177Z ##[debug]Loading inputs
2025-07-03T08:13:31.4752927Z ##[debug]Evaluating: (((github.server_url == 'https://github.com') && github.token) || '')
2025-07-03T08:13:31.4753430Z ##[debug]Evaluating Or:
2025-07-03T08:13:31.4755140Z ##[debug]..Evaluating And:
2025-07-03T08:13:31.4756819Z ##[debug]....Evaluating Equal:
2025-07-03T08:13:31.4757830Z ##[debug]......Evaluating Index:
2025-07-03T08:13:31.4758092Z ##[debug]........Evaluating github:
2025-07-03T08:13:31.4758386Z ##[debug]........=> Object
2025-07-03T08:13:31.4758683Z ##[debug]........Evaluating String:
2025-07-03T08:13:31.4758939Z ##[debug]........=> 'server_url'
2025-07-03T08:13:31.4759436Z ##[debug]......=> 'https://github.com'
2025-07-03T08:13:31.4759741Z ##[debug]......Evaluating String:
2025-07-03T08:13:31.4759983Z ##[debug]......=> 'https://github.com'
2025-07-03T08:13:31.4762928Z ##[debug]....=> true
2025-07-03T08:13:31.4763613Z ##[debug]....Evaluating Index:
2025-07-03T08:13:31.4763884Z ##[debug]......Evaluating github:
2025-07-03T08:13:31.4764143Z ##[debug]......=> Object
2025-07-03T08:13:31.4764377Z ##[debug]......Evaluating String:
2025-07-03T08:13:31.4764627Z ##[debug]......=> 'token'
2025-07-03T08:13:31.4765093Z ##[debug]....=> '***'
2025-07-03T08:13:31.4765433Z ##[debug]..=> '***'
2025-07-03T08:13:31.4765927Z ##[debug]=> '***'
2025-07-03T08:13:31.4771330Z ##[debug]Expanded: ((('https://github.com' == 'https://github.com') && '***') || '')
2025-07-03T08:13:31.4771890Z ##[debug]Result: '***'
2025-07-03T08:13:31.4773948Z ##[debug]Loading env
2025-07-03T08:13:31.4778711Z ##[group]Run actions/setup-node@v4
2025-07-03T08:13:31.4778952Z with:
2025-07-03T08:13:31.4779118Z   node-version: 20
2025-07-03T08:13:31.4779626Z   always-auth: false
2025-07-03T08:13:31.4779874Z   check-latest: false
2025-07-03T08:13:31.4780174Z   token: ***
2025-07-03T08:13:31.4780357Z ##[endgroup]
2025-07-03T08:13:31.6623716Z ##[debug]isExplicit: 
2025-07-03T08:13:31.6626170Z ##[debug]explicit? false
2025-07-03T08:13:31.6639150Z ##[debug]isExplicit: 18.20.8
2025-07-03T08:13:31.6640415Z ##[debug]explicit? true
2025-07-03T08:13:31.6652473Z ##[debug]isExplicit: 20.19.2
2025-07-03T08:13:31.6653383Z ##[debug]explicit? true
2025-07-03T08:13:31.6661859Z ##[debug]isExplicit: 22.16.0
2025-07-03T08:13:31.6662817Z ##[debug]explicit? true
2025-07-03T08:13:31.6666344Z ##[debug]evaluating 3 versions
2025-07-03T08:13:31.6696784Z ##[debug]matched: 20.19.2
2025-07-03T08:13:31.6704067Z ##[debug]checking cache: /opt/hostedtoolcache/node/20.19.2/x64
2025-07-03T08:13:31.6705030Z ##[debug]Found tool in cache node 20.19.2 x64
2025-07-03T08:13:31.6705655Z Found in cache @ /opt/hostedtoolcache/node/20.19.2/x64
2025-07-03T08:13:31.6707297Z ::group::Environment details
2025-07-03T08:13:31.6707757Z ##[group]Environment details
2025-07-03T08:13:32.0788449Z node: v20.19.2
2025-07-03T08:13:32.0790563Z npm: 10.8.2
2025-07-03T08:13:32.0790862Z yarn: 1.22.22
2025-07-03T08:13:32.0791557Z ::endgroup::
2025-07-03T08:13:32.0791856Z ##[endgroup]
2025-07-03T08:13:32.0802460Z ##[add-matcher]/home/runner/work/_actions/actions/setup-node/v4/.github/tsc.json
2025-07-03T08:13:32.0830304Z ##[debug]Added matchers: 'tsc'. Problem matchers scan action output for known warning or error strings and report these inline.
2025-07-03T08:13:32.0837075Z ##[add-matcher]/home/runner/work/_actions/actions/setup-node/v4/.github/eslint-stylish.json
2025-07-03T08:13:32.0846948Z ##[debug]Added matchers: 'eslint-stylish'. Problem matchers scan action output for known warning or error strings and report these inline.
2025-07-03T08:13:32.0848836Z ##[add-matcher]/home/runner/work/_actions/actions/setup-node/v4/.github/eslint-compact.json
2025-07-03T08:13:32.0852651Z ##[debug]Added matchers: 'eslint-compact'. Problem matchers scan action output for known warning or error strings and report these inline.
2025-07-03T08:13:32.0876145Z ##[debug]Node Action run completed with exit code 0
2025-07-03T08:13:32.0879663Z ##[debug]Set output node-version = v20.19.2
2025-07-03T08:13:32.0880622Z ##[debug]Finishing: Setup Node.js
2025-07-03T08:13:32.0887210Z ##[debug]Evaluating condition for step: 'Install Dependencies'
2025-07-03T08:13:32.0888603Z ##[debug]Evaluating: success()
2025-07-03T08:13:32.0888948Z ##[debug]Evaluating success:
2025-07-03T08:13:32.0889713Z ##[debug]=> true
2025-07-03T08:13:32.0890118Z ##[debug]Result: true
2025-07-03T08:13:32.0890699Z ##[debug]Starting: Install Dependencies
2025-07-03T08:13:32.0900951Z ##[debug]Loading inputs
2025-07-03T08:13:32.0901843Z ##[debug]Loading env
2025-07-03T08:13:32.0917688Z ##[group]Run if [ -f yarn.lock ]; then
2025-07-03T08:13:32.0918101Z [36;1mif [ -f yarn.lock ]; then[0m
2025-07-03T08:13:32.0918386Z [36;1m  yarn install --frozen-lockfile[0m
2025-07-03T08:13:32.0918630Z [36;1melse[0m
2025-07-03T08:13:32.0918808Z [36;1m  npm ci[0m
2025-07-03T08:13:32.0918976Z [36;1mfi[0m
2025-07-03T08:13:32.1015731Z shell: /usr/bin/bash -e {0}
2025-07-03T08:13:32.1015997Z ##[endgroup]
2025-07-03T08:13:32.1103222Z ##[debug]/usr/bin/bash -e /home/runner/work/_temp/dddcf418-9a97-4a9a-94d7-922ab2b5dd61.sh
2025-07-03T08:13:36.9231848Z npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
2025-07-03T08:13:38.0318068Z npm warn deprecated critters@0.0.25: Ownership of Critters has moved to the Nuxt team, who will be maintaining the project going forward. If you'd like to keep using Critters, please switch to the actively-maintained fork at https://github.com/danielroe/beasties
2025-07-03T08:13:38.3202940Z npm warn deprecated @supabase/auth-helpers-shared@0.7.0: This package is now deprecated - please use the @supabase/ssr package instead.
2025-07-03T08:13:39.3571352Z npm warn deprecated @supabase/auth-helpers-nextjs@0.10.0: This package is now deprecated - please use the @supabase/ssr package instead.
2025-07-03T08:13:39.8272703Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2025-07-03T08:13:39.9149464Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2025-07-03T08:13:40.0802469Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2025-07-03T08:13:40.2660903Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2025-07-03T08:13:54.7767528Z 
2025-07-03T08:13:54.7772199Z added 763 packages, and audited 764 packages in 23s
2025-07-03T08:13:54.7772661Z 
2025-07-03T08:13:54.7773219Z 100 packages are looking for funding
2025-07-03T08:13:54.7773694Z   run `npm fund` for details
2025-07-03T08:13:54.7803971Z 
2025-07-03T08:13:54.7805503Z 1 low severity vulnerability
2025-07-03T08:13:54.7808476Z 
2025-07-03T08:13:54.7810592Z To address all issues, run:
2025-07-03T08:13:54.7815467Z   npm audit fix
2025-07-03T08:13:54.7815682Z 
2025-07-03T08:13:54.7815897Z Run `npm audit` for details.
2025-07-03T08:13:54.8257274Z ##[debug]Finishing: Install Dependencies
2025-07-03T08:13:54.8271467Z ##[debug]Evaluating condition for step: 'Build Next.js'
2025-07-03T08:13:54.8274626Z ##[debug]Evaluating: success()
2025-07-03T08:13:54.8275317Z ##[debug]Evaluating success:
2025-07-03T08:13:54.8275769Z ##[debug]=> true
2025-07-03T08:13:54.8276221Z ##[debug]Result: true
2025-07-03T08:13:54.8276862Z ##[debug]Starting: Build Next.js
2025-07-03T08:13:54.8290854Z ##[debug]Loading inputs
2025-07-03T08:13:54.8292006Z ##[debug]Loading env
2025-07-03T08:13:54.8297051Z ##[group]Run npm run build
2025-07-03T08:13:54.8297355Z [36;1mnpm run build[0m
2025-07-03T08:13:54.8358906Z shell: /usr/bin/bash -e {0}
2025-07-03T08:13:54.8359461Z ##[endgroup]
2025-07-03T08:13:54.8424277Z ##[debug]/usr/bin/bash -e /home/runner/work/_temp/0c92b445-fd44-48c9-b497-ae37abe47963.sh
2025-07-03T08:13:54.9636372Z 
2025-07-03T08:13:54.9637289Z > my-v0-project@0.1.0 build
2025-07-03T08:13:54.9637793Z > next build
2025-07-03T08:13:54.9638024Z 
2025-07-03T08:13:55.5913736Z ⚠ No build cache found. Please configure build caching for faster rebuilds. Read more: https://nextjs.org/docs/messages/no-cache
2025-07-03T08:13:55.6051145Z Attention: Next.js now collects completely anonymous telemetry regarding usage.
2025-07-03T08:13:55.6054240Z This information is used to shape Next.js' roadmap and prioritize features.
2025-07-03T08:13:55.6055951Z You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
2025-07-03T08:13:55.6056967Z https://nextjs.org/telemetry
2025-07-03T08:13:55.6057273Z 
2025-07-03T08:13:55.6688679Z    ▲ Next.js 15.3.1
2025-07-03T08:13:55.6695504Z    - Environments: .env
2025-07-03T08:13:55.6696058Z    - Experiments (use with caution):
2025-07-03T08:13:55.6696739Z      ✓ optimizeCss
2025-07-03T08:13:55.6697215Z      ✓ scrollRestoration
2025-07-03T08:13:55.6697507Z 
2025-07-03T08:13:55.7368508Z    Creating an optimized production build ...
2025-07-03T08:14:43.6240377Z  ✓ Compiled successfully in 47s
2025-07-03T08:14:43.6290372Z    Linting and checking validity of types ...
2025-07-03T08:14:57.4313585Z    Collecting page data ...
2025-07-03T08:14:57.9443421Z  ⚠ Using edge runtime on a page currently disables static generation for that page
2025-07-03T08:15:00.5652157Z    Generating static pages (0/14) ...
2025-07-03T08:15:01.7168058Z    Generating static pages (3/14) 
2025-07-03T08:15:01.7169556Z    Generating static pages (6/14) 
2025-07-03T08:15:01.8975206Z    Generating static pages (10/14) 
2025-07-03T08:15:01.8980868Z  ✓ Generating static pages (14/14)
2025-07-03T08:15:02.2500468Z    Finalizing page optimization ...
2025-07-03T08:15:02.2501056Z    Collecting build traces ...
2025-07-03T08:15:10.3286491Z 
2025-07-03T08:15:10.3398081Z Route (app)                                 Size  First Load JS
2025-07-03T08:15:10.3400690Z ┌ ○ /                                      201 B         241 kB
2025-07-03T08:15:10.3401642Z ├ ○ /_not-found                            990 B         103 kB
2025-07-03T08:15:10.3402652Z ├ ƒ /api/export                            210 B         102 kB
2025-07-03T08:15:10.3403496Z ├ ƒ /api/finanzen                          210 B         102 kB
2025-07-03T08:15:10.3404428Z ├ ƒ /api/finanzen/[id]                     210 B         102 kB
2025-07-03T08:15:10.3405228Z ├ ƒ /api/haeuser                           210 B         102 kB
2025-07-03T08:15:10.3405983Z ├ ƒ /api/mieter                            210 B         102 kB
2025-07-03T08:15:10.3406831Z ├ ƒ /api/stripe/cancel-subscription        210 B         102 kB
2025-07-03T08:15:10.3407680Z ├ ƒ /api/stripe/checkout-session           210 B         102 kB
2025-07-03T08:15:10.3408523Z ├ ƒ /api/stripe/customer-portal            210 B         102 kB
2025-07-03T08:15:10.3409550Z ├ ƒ /api/stripe/plans                      210 B         102 kB
2025-07-03T08:15:10.3415213Z ├ ƒ /api/stripe/verify-session             210 B         102 kB
2025-07-03T08:15:10.3416168Z ├ ƒ /api/stripe/webhook                    210 B         102 kB
2025-07-03T08:15:10.3417468Z ├ ƒ /api/todos                             210 B         102 kB
2025-07-03T08:15:10.3418386Z ├ ƒ /api/todos/[id]                        210 B         102 kB
2025-07-03T08:15:10.3419461Z ├ ƒ /api/user/profile                      210 B         102 kB
2025-07-03T08:15:10.3420362Z ├ ƒ /api/wohnungen                         210 B         102 kB
2025-07-03T08:15:10.3421219Z ├ ƒ /auth/callback                         210 B         102 kB
2025-07-03T08:15:10.3422016Z ├ ○ /auth/login                          4.21 kB         156 kB
2025-07-03T08:15:10.3422850Z ├ ○ /auth/register                        4.3 kB         156 kB
2025-07-03T08:15:10.3423818Z ├ ○ /auth/reset-password                 4.09 kB         155 kB
2025-07-03T08:15:10.3424698Z ├ ○ /auth/update-password                4.07 kB         152 kB
2025-07-03T08:15:10.3425570Z ├ ƒ /betriebskosten                      19.8 kB         208 kB
2025-07-03T08:15:10.3426424Z ├ ○ /checkout/cancel                     1.91 kB         114 kB
2025-07-03T08:15:10.3427331Z ├ ○ /checkout/success                    3.41 kB         116 kB
2025-07-03T08:15:10.3428263Z ├ ƒ /finanzen                            17.7 kB         273 kB
2025-07-03T08:15:10.3429055Z ├ ƒ /haeuser                             8.99 kB         148 kB
2025-07-03T08:15:10.3430084Z ├ ƒ /home                                5.24 kB         292 kB
2025-07-03T08:15:10.3430888Z ├ ○ /landing                               202 B         241 kB
2025-07-03T08:15:10.3431771Z ├ ƒ /mieter                              5.94 kB         231 kB
2025-07-03T08:15:10.3432644Z ├ ○ /modern/documentation                4.98 kB         231 kB
2025-07-03T08:15:10.3433499Z ├ ○ /subscription                        6.93 kB         116 kB
2025-07-03T08:15:10.3434326Z ├ ○ /subscription-locked                 3.54 kB         117 kB
2025-07-03T08:15:10.3434958Z ├ ƒ /todos                               9.89 kB         161 kB
2025-07-03T08:15:10.3435537Z └ ƒ /wohnungen                           8.03 kB         186 kB
2025-07-03T08:15:10.3436306Z + First Load JS shared by all             102 kB
2025-07-03T08:15:10.3436852Z   ├ chunks/1317-4be7c8f2dda6a784.js      46.4 kB
2025-07-03T08:15:10.3437365Z   ├ chunks/4bd1b696-86b7f7b384ded616.js  53.2 kB
2025-07-03T08:15:10.3437859Z   └ other shared chunks (total)          2.24 kB
2025-07-03T08:15:10.3438116Z 
2025-07-03T08:15:10.3438124Z 
2025-07-03T08:15:10.3438429Z ƒ Middleware                             66.2 kB
2025-07-03T08:15:10.3438700Z 
2025-07-03T08:15:10.3439035Z ○  (Static)   prerendered as static content
2025-07-03T08:15:10.3439957Z ƒ  (Dynamic)  server-rendered on demand
2025-07-03T08:15:10.3440268Z 
2025-07-03T08:15:10.4762674Z ##[debug]Finishing: Build Next.js
2025-07-03T08:15:10.4774780Z ##[debug]Evaluating condition for step: 'Serve static files'
2025-07-03T08:15:10.4776766Z ##[debug]Evaluating: success()
2025-07-03T08:15:10.4777349Z ##[debug]Evaluating success:
2025-07-03T08:15:10.4777979Z ##[debug]=> true
2025-07-03T08:15:10.4778586Z ##[debug]Result: true
2025-07-03T08:15:10.4779840Z ##[debug]Starting: Serve static files
2025-07-03T08:15:10.4794228Z ##[debug]Loading inputs
2025-07-03T08:15:10.4795454Z ##[debug]Loading env
2025-07-03T08:15:10.4801918Z ##[group]Run # 'serve' im Hintergrund starten auf Port 5000
2025-07-03T08:15:10.4802578Z [36;1m# 'serve' im Hintergrund starten auf Port 5000[0m
2025-07-03T08:15:10.4803101Z [36;1mnpx serve out -l 5000 &[0m
2025-07-03T08:15:10.4803599Z [36;1m# Kurze Pause, damit der Server hochfährt[0m
2025-07-03T08:15:10.4804059Z [36;1msleep 5[0m
2025-07-03T08:15:10.4885801Z shell: /usr/bin/bash -e {0}
2025-07-03T08:15:10.4886207Z ##[endgroup]
2025-07-03T08:15:10.4949694Z ##[debug]/usr/bin/bash -e /home/runner/work/_temp/89ed2ac2-01d9-402b-abe9-bf05bdd7ca8e.sh
2025-07-03T08:15:11.4014122Z npm warn exec The following package was not found and will be installed: serve@14.2.4
2025-07-03T08:15:15.1346810Z  INFO  Accepting connections at http://localhost:5000
2025-07-03T08:15:20.5052760Z ##[debug]Finishing: Serve static files
2025-07-03T08:15:20.5073252Z ##[debug]Evaluating condition for step: 'Run Lighthouse Performance Audit'
2025-07-03T08:15:20.5076950Z ##[debug]Evaluating: success()
2025-07-03T08:15:20.5078411Z ##[debug]Evaluating success:
2025-07-03T08:15:20.5080142Z ##[debug]=> true
2025-07-03T08:15:20.5081485Z ##[debug]Result: true
2025-07-03T08:15:20.5083036Z ##[debug]Starting: Run Lighthouse Performance Audit
2025-07-03T08:15:20.5100597Z ##[debug]Loading inputs
2025-07-03T08:15:20.5112887Z ##[warning]Unexpected input(s) 'url', 'thresholds', 'output', valid inputs are ['entryPoint', 'args']
2025-07-03T08:15:20.5121622Z ##[debug]Loading env
2025-07-03T08:15:20.5130694Z ##[group]Run jakejarvis/lighthouse-action@v0.3.2
2025-07-03T08:15:20.5131179Z with:
2025-07-03T08:15:20.5131517Z   url: http://localhost:5000
2025-07-03T08:15:20.5132020Z   thresholds: {"performance": 90, "accessibility": 80}
2025-07-03T08:15:20.5132537Z   output: html,json
2025-07-03T08:15:20.5132871Z ##[endgroup]
2025-07-03T08:15:20.5241695Z ##[command]/usr/bin/docker run --name d074b8e6686fa9c9574dabb294548d56d983b7_3b0986 --label d074b8 --workdir /github/workspace --rm -e "INPUT_URL" -e "INPUT_THRESHOLDS" -e "INPUT_OUTPUT" -e "HOME" -e "GITHUB_JOB" -e "GITHUB_REF" -e "GITHUB_SHA" -e "GITHUB_REPOSITORY" -e "GITHUB_REPOSITORY_OWNER" -e "GITHUB_REPOSITORY_OWNER_ID" -e "GITHUB_RUN_ID" -e "GITHUB_RUN_NUMBER" -e "GITHUB_RETENTION_DAYS" -e "GITHUB_RUN_ATTEMPT" -e "GITHUB_ACTOR_ID" -e "GITHUB_ACTOR" -e "GITHUB_WORKFLOW" -e "GITHUB_HEAD_REF" -e "GITHUB_BASE_REF" -e "GITHUB_EVENT_NAME" -e "GITHUB_SERVER_URL" -e "GITHUB_API_URL" -e "GITHUB_GRAPHQL_URL" -e "GITHUB_REF_NAME" -e "GITHUB_REF_PROTECTED" -e "GITHUB_REF_TYPE" -e "GITHUB_WORKFLOW_REF" -e "GITHUB_WORKFLOW_SHA" -e "GITHUB_REPOSITORY_ID" -e "GITHUB_TRIGGERING_ACTOR" -e "GITHUB_WORKSPACE" -e "GITHUB_ACTION" -e "GITHUB_EVENT_PATH" -e "GITHUB_ACTION_REPOSITORY" -e "GITHUB_ACTION_REF" -e "GITHUB_PATH" -e "GITHUB_ENV" -e "GITHUB_STEP_SUMMARY" -e "GITHUB_STATE" -e "GITHUB_OUTPUT" -e "RUNNER_DEBUG" -e "RUNNER_OS" -e "RUNNER_ARCH" -e "RUNNER_NAME" -e "RUNNER_ENVIRONMENT" -e "RUNNER_TOOL_CACHE" -e "RUNNER_TEMP" -e "RUNNER_WORKSPACE" -e "ACTIONS_RUNTIME_URL" -e "ACTIONS_RUNTIME_TOKEN" -e "ACTIONS_CACHE_URL" -e "ACTIONS_RESULTS_URL" -e GITHUB_ACTIONS=true -e CI=true -v "/var/run/docker.sock":"/var/run/docker.sock" -v "/home/runner/work/_temp/_github_home":"/github/home" -v "/home/runner/work/_temp/_github_workflow":"/github/workflow" -v "/home/runner/work/_temp/_runner_file_commands":"/github/file_commands" -v "/home/runner/work/RMS/RMS":"/github/workspace" d074b8:e6686fa9c9574dabb294548d56d983b7
2025-07-03T08:15:21.9954305Z * Beginning audit of http://localhost:5000 ...
2025-07-03T08:15:21.9955875Z 
2025-07-03T08:15:22.1005585Z file:///usr/local/lib/node_modules/lighthouse/shared/localization/locales.js:24
2025-07-03T08:15:22.1006534Z import ar from './locales/ar.json' with { type: 'json' };
2025-07-03T08:15:22.1007101Z                                    ^^^^
2025-07-03T08:15:22.1007385Z 
2025-07-03T08:15:22.1007655Z SyntaxError: Unexpected token 'with'
2025-07-03T08:15:22.1008348Z     at Loader.moduleStrategy (internal/modules/esm/translators.js:145:18)
2025-07-03T08:15:22.1917004Z ##[debug]Docker Action run completed with exit code 1
2025-07-03T08:15:22.1922747Z ##[debug]Finishing: Run Lighthouse Performance Audit
2025-07-03T08:15:22.1941358Z ##[debug]Evaluating condition for step: 'Upload Lighthouse Reports'
2025-07-03T08:15:22.1943412Z ##[debug]Evaluating: success()
2025-07-03T08:15:22.1943782Z ##[debug]Evaluating success:
2025-07-03T08:15:22.1944146Z ##[debug]=> false
2025-07-03T08:15:22.1944491Z ##[debug]Result: false
2025-07-03T08:15:22.1949984Z ##[debug]Evaluating condition for step: 'Post Setup Node.js'
2025-07-03T08:15:22.1951080Z ##[debug]Evaluating: success()
2025-07-03T08:15:22.1951416Z ##[debug]Evaluating success:
2025-07-03T08:15:22.1951733Z ##[debug]=> false
2025-07-03T08:15:22.1952054Z ##[debug]Result: false
2025-07-03T08:15:22.1956184Z ##[debug]Evaluating condition for step: 'Post Checkout Repository'
2025-07-03T08:15:22.1957941Z ##[debug]Evaluating: always()
2025-07-03T08:15:22.1958279Z ##[debug]Evaluating always:
2025-07-03T08:15:22.1958989Z ##[debug]=> true
2025-07-03T08:15:22.1959684Z ##[debug]Result: true
2025-07-03T08:15:22.1960195Z ##[debug]Starting: Post Checkout Repository
2025-07-03T08:15:22.1986376Z ##[debug]Loading inputs
2025-07-03T08:15:22.1987245Z ##[debug]Evaluating: github.repository
2025-07-03T08:15:22.1987571Z ##[debug]Evaluating Index:
2025-07-03T08:15:22.1987804Z ##[debug]..Evaluating github:
2025-07-03T08:15:22.1988064Z ##[debug]..=> Object
2025-07-03T08:15:22.1988280Z ##[debug]..Evaluating String:
2025-07-03T08:15:22.1988531Z ##[debug]..=> 'repository'
2025-07-03T08:15:22.1988826Z ##[debug]=> 'NtFelix/RMS'
2025-07-03T08:15:22.1989055Z ##[debug]Result: 'NtFelix/RMS'
2025-07-03T08:15:22.1990537Z ##[debug]Evaluating: github.token
2025-07-03T08:15:22.1990808Z ##[debug]Evaluating Index:
2025-07-03T08:15:22.1991079Z ##[debug]..Evaluating github:
2025-07-03T08:15:22.1991320Z ##[debug]..=> Object
2025-07-03T08:15:22.1991543Z ##[debug]..Evaluating String:
2025-07-03T08:15:22.1991780Z ##[debug]..=> 'token'
2025-07-03T08:15:22.1992171Z ##[debug]=> '***'
2025-07-03T08:15:22.1992499Z ##[debug]Result: '***'
2025-07-03T08:15:22.1999832Z ##[debug]Loading env
2025-07-03T08:15:22.2003247Z Post job cleanup.
2025-07-03T08:15:22.2921637Z ##[debug]Getting git version
2025-07-03T08:15:22.2937281Z [command]/usr/bin/git version
2025-07-03T08:15:22.2977317Z git version 2.49.0
2025-07-03T08:15:22.3000071Z ##[debug]0
2025-07-03T08:15:22.3001283Z ##[debug]git version 2.49.0
2025-07-03T08:15:22.3001674Z ##[debug]
2025-07-03T08:15:22.3002865Z ##[debug]Set git useragent to: git/2.49.0 (github-actions-checkout)
2025-07-03T08:15:22.3006622Z ::add-mask::***
2025-07-03T08:15:22.3024103Z Temporarily overriding HOME='/home/runner/work/_temp/74a6f600-83b9-4667-bc47-e2077bde31b8' before making global git config changes
2025-07-03T08:15:22.3026676Z Adding repository directory to the temporary git global config as a safe directory
2025-07-03T08:15:22.3040425Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/RMS/RMS
2025-07-03T08:15:22.3068774Z ##[debug]0
2025-07-03T08:15:22.3069998Z ##[debug]
2025-07-03T08:15:22.3077233Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-07-03T08:15:22.3106818Z ##[debug]1
2025-07-03T08:15:22.3107778Z ##[debug]
2025-07-03T08:15:22.3115246Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-07-03T08:15:22.3344269Z ##[debug]0
2025-07-03T08:15:22.3346341Z ##[debug]
2025-07-03T08:15:22.3351842Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-07-03T08:15:22.3374814Z http.https://github.com/.extraheader
2025-07-03T08:15:22.3382942Z ##[debug]0
2025-07-03T08:15:22.3384060Z ##[debug]http.https://github.com/.extraheader
2025-07-03T08:15:22.3384565Z ##[debug]
2025-07-03T08:15:22.3390215Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
2025-07-03T08:15:22.3417493Z ##[debug]0
2025-07-03T08:15:22.3419078Z ##[debug]
2025-07-03T08:15:22.3425477Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-07-03T08:15:22.3646910Z ##[debug]0
2025-07-03T08:15:22.3650005Z ##[debug]
2025-07-03T08:15:22.3650550Z ##[debug]Unsetting HOME override
2025-07-03T08:15:22.3712366Z ##[debug]Node Action run completed with exit code 0
2025-07-03T08:15:22.3714516Z ##[debug]Finishing: Post Checkout Repository
2025-07-03T08:15:22.3753476Z ##[debug]Starting: Complete job
2025-07-03T08:15:22.3755003Z Uploading runner diagnostic logs
2025-07-03T08:15:22.3765299Z ##[debug]Starting diagnostic file upload.
2025-07-03T08:15:22.3765845Z ##[debug]Setting up diagnostic log folders.
2025-07-03T08:15:22.3768226Z ##[debug]Creating diagnostic log files folder.
2025-07-03T08:15:22.3776783Z ##[debug]Copying 1 worker diagnostic logs.
2025-07-03T08:15:22.3785610Z ##[debug]Copying 1 runner diagnostic logs.
2025-07-03T08:15:22.3786651Z ##[debug]Zipping diagnostic files.
2025-07-03T08:15:22.3866793Z ##[debug]Uploading diagnostic metadata file.
2025-07-03T08:15:22.3890291Z ##[debug]Diagnostic file upload complete.
2025-07-03T08:15:22.3890808Z Completed runner diagnostic log upload
2025-07-03T08:15:22.3891080Z Cleaning up orphan processes
2025-07-03T08:15:22.4162782Z Terminate orphan process: pid (2283) (npm exec serve out -l 5000)
2025-07-03T08:15:22.4195897Z Terminate orphan process: pid (2296) (sh)
2025-07-03T08:15:22.4228786Z Terminate orphan process: pid (2297) (node)
2025-07-03T08:15:22.4320807Z ##[debug]Finishing: Complete job
2025-07-03T08:15:22.4375250Z ##[debug]Finishing: build-and-lighthouse