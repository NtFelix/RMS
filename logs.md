2025-07-03T08:03:38.0792812Z Current runner version: '2.325.0'
2025-07-03T08:03:38.0831806Z ##[group]Runner Image Provisioner
2025-07-03T08:03:38.0833126Z Hosted Compute Agent
2025-07-03T08:03:38.0834072Z Version: 20250620.352
2025-07-03T08:03:38.0835131Z Commit: f262f3aba23b10ea191b2a62bdee1ca4c3d344da
2025-07-03T08:03:38.0836207Z Build Date: 2025-06-20T19:27:17Z
2025-07-03T08:03:38.0837335Z ##[endgroup]
2025-07-03T08:03:38.0838298Z ##[group]Operating System
2025-07-03T08:03:38.0839178Z Ubuntu
2025-07-03T08:03:38.0840272Z 24.04.2
2025-07-03T08:03:38.0840983Z LTS
2025-07-03T08:03:38.0841769Z ##[endgroup]
2025-07-03T08:03:38.0842606Z ##[group]Runner Image
2025-07-03T08:03:38.0843568Z Image: ubuntu-24.04
2025-07-03T08:03:38.0844330Z Version: 20250622.1.0
2025-07-03T08:03:38.0846253Z Included Software: https://github.com/actions/runner-images/blob/ubuntu24/20250622.1/images/ubuntu/Ubuntu2404-Readme.md
2025-07-03T08:03:38.0848931Z Image Release: https://github.com/actions/runner-images/releases/tag/ubuntu24%2F20250622.1
2025-07-03T08:03:38.0851028Z ##[endgroup]
2025-07-03T08:03:38.0852932Z ##[group]GITHUB_TOKEN Permissions
2025-07-03T08:03:38.0855608Z Contents: read
2025-07-03T08:03:38.0856456Z Metadata: read
2025-07-03T08:03:38.0857245Z Packages: read
2025-07-03T08:03:38.0858159Z ##[endgroup]
2025-07-03T08:03:38.0861950Z Secret source: Actions
2025-07-03T08:03:38.0863302Z Prepare workflow directory
2025-07-03T08:03:38.1342544Z Prepare all required actions
2025-07-03T08:03:38.1401699Z Getting action download info
2025-07-03T08:03:38.4556478Z ##[group]Download immutable action package 'actions/checkout@v4'
2025-07-03T08:03:38.4557531Z Version: 4.2.2
2025-07-03T08:03:38.4558771Z Digest: sha256:ccb2698953eaebd21c7bf6268a94f9c26518a7e38e27e0b83c1fe1ad049819b1
2025-07-03T08:03:38.4560475Z Source commit SHA: 11bd71901bbe5b1630ceea73d27597364c9af683
2025-07-03T08:03:38.4561239Z ##[endgroup]
2025-07-03T08:03:38.5747176Z ##[group]Download immutable action package 'actions/setup-node@v4'
2025-07-03T08:03:38.5748787Z Version: 4.4.0
2025-07-03T08:03:38.5751022Z Digest: sha256:9427cefe82346e992fb5b949e3569b39d537ae41aa3086483b14eceebfc16bc1
2025-07-03T08:03:38.5752379Z Source commit SHA: 49933ea5288caeca8642d1e84afbd3f7d6820020
2025-07-03T08:03:38.5753171Z ##[endgroup]
2025-07-03T08:03:38.6782446Z Download action repository 'jakejarvis/lighthouse-action@v0.3.2' (SHA:a3bcc9973b3ce65beff316b3cac53b92e58dcc12)
2025-07-03T08:03:38.9688013Z ##[group]Download immutable action package 'actions/upload-artifact@v4'
2025-07-03T08:03:38.9688825Z Version: 4.6.2
2025-07-03T08:03:38.9689542Z Digest: sha256:290722aa3281d5caf23d0acdc3dbeb3424786a1a01a9cc97e72f147225e37c38
2025-07-03T08:03:38.9690840Z Source commit SHA: ea165f8d65b6e75b540449e92b4886f43607fa02
2025-07-03T08:03:38.9691535Z ##[endgroup]
2025-07-03T08:03:39.2181233Z Complete job name: build-and-lighthouse
2025-07-03T08:03:39.2627946Z ##[group]Build container for action use: '/home/runner/work/_actions/jakejarvis/lighthouse-action/v0.3.2/Dockerfile'.
2025-07-03T08:03:39.2671346Z ##[command]/usr/bin/docker build -t c15049:4314e39d565f47c3a0ce4588a345a052 -f "/home/runner/work/_actions/jakejarvis/lighthouse-action/v0.3.2/Dockerfile" "/home/runner/work/_actions/jakejarvis/lighthouse-action/v0.3.2"
2025-07-03T08:03:39.9361896Z #0 building with "default" instance using docker driver
2025-07-03T08:03:39.9363654Z 
2025-07-03T08:03:39.9364227Z #1 [internal] load build definition from Dockerfile
2025-07-03T08:03:39.9365922Z #1 transferring dockerfile: 834B done
2025-07-03T08:03:39.9368618Z #1 DONE 0.0s
2025-07-03T08:03:39.9369548Z 
2025-07-03T08:03:39.9370615Z #2 [auth] jakejarvis/chrome-headless:pull token for registry-1.docker.io
2025-07-03T08:03:39.9371530Z #2 DONE 0.0s
2025-07-03T08:03:39.9371827Z 
2025-07-03T08:03:39.9372292Z #3 [internal] load metadata for docker.io/jakejarvis/chrome-headless:latest
2025-07-03T08:03:40.2455080Z #3 DONE 0.5s
2025-07-03T08:03:40.3778912Z 
2025-07-03T08:03:40.3779985Z #4 [internal] load .dockerignore
2025-07-03T08:03:40.3781563Z #4 transferring context: 175B done
2025-07-03T08:03:40.3783024Z #4 DONE 0.0s
2025-07-03T08:03:40.3784305Z 
2025-07-03T08:03:40.3784917Z #5 [internal] load build context
2025-07-03T08:03:40.3786204Z #5 transferring context: 2.60kB done
2025-07-03T08:03:40.3787492Z #5 DONE 0.0s
2025-07-03T08:03:40.3788110Z 
2025-07-03T08:03:40.3790093Z #6 [1/3] FROM docker.io/jakejarvis/chrome-headless:latest@sha256:ec66d77377b7918d2807680e8c00875fdafe655a6778877c3cb7a9f27935a368
2025-07-03T08:03:40.3793714Z #6 resolve docker.io/jakejarvis/chrome-headless:latest@sha256:ec66d77377b7918d2807680e8c00875fdafe655a6778877c3cb7a9f27935a368 done
2025-07-03T08:03:40.3798225Z #6 sha256:ec66d77377b7918d2807680e8c00875fdafe655a6778877c3cb7a9f27935a368 1.79kB / 1.79kB done
2025-07-03T08:03:40.3801329Z #6 sha256:314092a194210e97832505d34b04794a70417a6a3a50e1128e98b575fb8df4a8 9.84kB / 9.84kB done
2025-07-03T08:03:40.3804291Z #6 sha256:60a69d75fccb7bac2b8e27a6dbbb1124276384bf383f6ea778b6f34f04eb4ece 0B / 35.09MB 0.1s
2025-07-03T08:03:40.3807205Z #6 sha256:a4cf4ce2967efea5be3ba9f99b3a9c7c3121228727b4ce0c5f40cfcb3eca9123 0B / 2.83MB 0.1s
2025-07-03T08:03:40.3814098Z #6 sha256:b5887238bf65fc2f40fdd004509b96300faa112cc64eb2865a09895474269ee7 7.34MB / 22.53MB 0.1s
2025-07-03T08:03:40.3819805Z #6 sha256:9f6e2724e654cd5458fbd864a8ba5bbdc90f6a43fc3e0ce5129750a02689b9d0 4.17kB / 4.17kB 0.1s done
2025-07-03T08:03:40.5694904Z #6 sha256:60a69d75fccb7bac2b8e27a6dbbb1124276384bf383f6ea778b6f34f04eb4ece 35.09MB / 35.09MB 0.3s
2025-07-03T08:03:40.5702554Z #6 sha256:a4cf4ce2967efea5be3ba9f99b3a9c7c3121228727b4ce0c5f40cfcb3eca9123 2.83MB / 2.83MB 0.2s done
2025-07-03T08:03:40.5722422Z #6 sha256:b5887238bf65fc2f40fdd004509b96300faa112cc64eb2865a09895474269ee7 22.53MB / 22.53MB 0.2s done
2025-07-03T08:03:40.5728224Z #6 sha256:7db16c57bdcfaf97c2149f76c5ae1e9878b0f58942eb136763878b75c3bd26e1 293B / 293B 0.2s done
2025-07-03T08:03:40.5732230Z #6 extracting sha256:b5887238bf65fc2f40fdd004509b96300faa112cc64eb2865a09895474269ee7
2025-07-03T08:03:40.5736475Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 0B / 149.27MB 0.3s
2025-07-03T08:03:40.5745509Z #6 sha256:55533aad29c2289e6fa907b2c314de533a181df091d06e443d80b28f17c70e1c 7.34MB / 8.75MB 0.3s
2025-07-03T08:03:40.6855712Z #6 sha256:60a69d75fccb7bac2b8e27a6dbbb1124276384bf383f6ea778b6f34f04eb4ece 35.09MB / 35.09MB 0.3s done
2025-07-03T08:03:40.6864451Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 20.97MB / 149.27MB 0.4s
2025-07-03T08:03:40.6869939Z #6 sha256:55533aad29c2289e6fa907b2c314de533a181df091d06e443d80b28f17c70e1c 8.75MB / 8.75MB 0.3s done
2025-07-03T08:03:40.7914101Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 41.45MB / 149.27MB 0.5s
2025-07-03T08:03:40.8980862Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 52.43MB / 149.27MB 0.6s
2025-07-03T08:03:41.0025222Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 65.70MB / 149.27MB 0.7s
2025-07-03T08:03:41.1062062Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 81.79MB / 149.27MB 0.8s
2025-07-03T08:03:41.2609200Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 119.54MB / 149.27MB 1.0s
2025-07-03T08:03:41.3598176Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 138.41MB / 149.27MB 1.1s
2025-07-03T08:03:41.5524400Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 149.27MB / 149.27MB 1.2s
2025-07-03T08:03:42.0102035Z #6 sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 149.27MB / 149.27MB 1.6s done
2025-07-03T08:03:42.1704837Z #6 extracting sha256:b5887238bf65fc2f40fdd004509b96300faa112cc64eb2865a09895474269ee7 1.7s done
2025-07-03T08:03:42.1707804Z #6 extracting sha256:9f6e2724e654cd5458fbd864a8ba5bbdc90f6a43fc3e0ce5129750a02689b9d0
2025-07-03T08:03:42.3230897Z #6 extracting sha256:9f6e2724e654cd5458fbd864a8ba5bbdc90f6a43fc3e0ce5129750a02689b9d0 done
2025-07-03T08:03:42.3355327Z #6 extracting sha256:60a69d75fccb7bac2b8e27a6dbbb1124276384bf383f6ea778b6f34f04eb4ece
2025-07-03T08:03:44.1519255Z #6 extracting sha256:60a69d75fccb7bac2b8e27a6dbbb1124276384bf383f6ea778b6f34f04eb4ece 1.7s done
2025-07-03T08:03:44.3571104Z #6 extracting sha256:a4cf4ce2967efea5be3ba9f99b3a9c7c3121228727b4ce0c5f40cfcb3eca9123
2025-07-03T08:03:44.4699209Z #6 extracting sha256:a4cf4ce2967efea5be3ba9f99b3a9c7c3121228727b4ce0c5f40cfcb3eca9123 0.1s done
2025-07-03T08:03:44.4705143Z #6 extracting sha256:7db16c57bdcfaf97c2149f76c5ae1e9878b0f58942eb136763878b75c3bd26e1 done
2025-07-03T08:03:44.4706322Z #6 extracting sha256:55533aad29c2289e6fa907b2c314de533a181df091d06e443d80b28f17c70e1c
2025-07-03T08:03:44.8266486Z #6 extracting sha256:55533aad29c2289e6fa907b2c314de533a181df091d06e443d80b28f17c70e1c 0.3s done
2025-07-03T08:03:44.8267763Z #6 extracting sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe
2025-07-03T08:03:48.5600024Z #6 extracting sha256:dbfd55654efef36cdb1d3a50eb51817482c0fbf201d4b65e4ec20ada3d0f4abe 3.6s done
2025-07-03T08:03:50.0406197Z #6 DONE 9.8s
2025-07-03T08:03:50.2081800Z 
2025-07-03T08:03:50.2082590Z #7 [2/3] RUN npm install -g lighthouse
2025-07-03T08:04:00.9742515Z #7 10.93 /usr/local/bin/lighthouse -> /usr/local/lib/node_modules/lighthouse/cli/index.js
2025-07-03T08:04:01.1946850Z #7 10.93 /usr/local/bin/smokehouse -> /usr/local/lib/node_modules/lighthouse/cli/test/smokehouse/frontends/smokehouse-bin.js
2025-07-03T08:04:01.1948882Z #7 10.93 /usr/local/bin/chrome-debug -> /usr/local/lib/node_modules/lighthouse/core/scripts/manual-chrome-launcher.js
2025-07-03T08:04:01.1951082Z #7 10.98 npm WARN notsup Unsupported engine for lighthouse@12.7.1: wanted: {"node":">=18.20"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:04:01.1953631Z #7 10.98 npm WARN notsup Not compatible with your version of node/npm: lighthouse@12.7.1
2025-07-03T08:04:01.1954726Z #7 10.98 npm WARN notsup Unsupported engine for configstore@7.0.0: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:04:01.1955776Z #7 10.98 npm WARN notsup Not compatible with your version of node/npm: configstore@7.0.0
2025-07-03T08:04:01.1956812Z #7 10.98 npm WARN notsup Unsupported engine for @sentry/node@9.34.0: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:04:01.1957849Z #7 10.98 npm WARN notsup Not compatible with your version of node/npm: @sentry/node@9.34.0
2025-07-03T08:04:01.1958913Z #7 10.98 npm WARN notsup Unsupported engine for puppeteer-core@24.11.2: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:04:01.1960148Z #7 10.98 npm WARN notsup Not compatible with your version of node/npm: puppeteer-core@24.11.2
2025-07-03T08:04:01.1961212Z #7 10.99 npm WARN notsup Unsupported engine for minimatch@9.0.5: wanted: {"node":">=16 || 14 >=14.17"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:04:01.1962510Z #7 10.99 npm WARN notsup Not compatible with your version of node/npm: minimatch@9.0.5
2025-07-03T08:04:01.1963660Z #7 10.99 npm WARN notsup Unsupported engine for @sentry/opentelemetry@9.34.0: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:04:01.1964844Z #7 10.99 npm WARN notsup Not compatible with your version of node/npm: @sentry/opentelemetry@9.34.0
2025-07-03T08:04:01.1965940Z #7 10.99 npm WARN notsup Unsupported engine for @sentry/core@9.34.0: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:04:01.1966966Z #7 10.99 npm WARN notsup Not compatible with your version of node/npm: @sentry/core@9.34.0
2025-07-03T08:04:01.1967962Z #7 10.99 npm WARN notsup Unsupported engine for dot-prop@9.0.0: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:04:01.1968959Z #7 10.99 npm WARN notsup Not compatible with your version of node/npm: dot-prop@9.0.0
2025-07-03T08:04:01.1970129Z #7 11.00 npm WARN notsup Unsupported engine for type-fest@4.41.0: wanted: {"node":">=16"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:04:01.1971130Z #7 11.00 npm WARN notsup Not compatible with your version of node/npm: type-fest@4.41.0
2025-07-03T08:04:01.1972441Z #7 11.00 npm WARN notsup Unsupported engine for @puppeteer/browsers@2.10.5: wanted: {"node":">=18"} (current: {"node":"14.16.0","npm":"6.14.11"})
2025-07-03T08:04:01.1973602Z #7 11.00 npm WARN notsup Not compatible with your version of node/npm: @puppeteer/browsers@2.10.5
2025-07-03T08:04:01.1974276Z #7 11.00 
2025-07-03T08:04:01.1974576Z #7 11.00 + lighthouse@12.7.1
2025-07-03T08:04:01.1975029Z #7 11.00 added 202 packages from 265 contributors in 10.468s
2025-07-03T08:04:01.9091451Z #7 DONE 11.9s
2025-07-03T08:04:02.0809409Z 
2025-07-03T08:04:02.0817500Z #8 [3/3] ADD entrypoint.sh /entrypoint.sh
2025-07-03T08:04:02.0821246Z #8 DONE 0.0s
2025-07-03T08:04:02.0821784Z 
2025-07-03T08:04:02.0822253Z #9 exporting to image
2025-07-03T08:04:02.0823905Z #9 exporting layers
2025-07-03T08:04:05.3595948Z #9 exporting layers 3.4s done
2025-07-03T08:04:05.3810292Z #9 writing image sha256:e71d0934c3bcb3462c9442a24dd0a0a83272c186d4216d35d96f27835eb18a0a done
2025-07-03T08:04:05.3811338Z #9 naming to docker.io/library/c15049:4314e39d565f47c3a0ce4588a345a052 done
2025-07-03T08:04:05.3817762Z #9 DONE 3.4s
2025-07-03T08:04:05.3894616Z ##[endgroup]
2025-07-03T08:04:05.4148120Z ##[group]Run actions/checkout@v4
2025-07-03T08:04:05.4148794Z with:
2025-07-03T08:04:05.4149548Z   repository: NtFelix/RMS
2025-07-03T08:04:05.4150274Z   token: ***
2025-07-03T08:04:05.4150576Z   ssh-strict: true
2025-07-03T08:04:05.4150867Z   ssh-user: git
2025-07-03T08:04:05.4151136Z   persist-credentials: true
2025-07-03T08:04:05.4151363Z   clean: true
2025-07-03T08:04:05.4151579Z   sparse-checkout-cone-mode: true
2025-07-03T08:04:05.4151816Z   fetch-depth: 1
2025-07-03T08:04:05.4152012Z   fetch-tags: false
2025-07-03T08:04:05.4152204Z   show-progress: true
2025-07-03T08:04:05.4152403Z   lfs: false
2025-07-03T08:04:05.4152576Z   submodules: false
2025-07-03T08:04:05.4152773Z   set-safe-directory: true
2025-07-03T08:04:05.4153311Z ##[endgroup]
2025-07-03T08:04:05.5304438Z Syncing repository: NtFelix/RMS
2025-07-03T08:04:05.5306250Z ##[group]Getting Git version info
2025-07-03T08:04:05.5316613Z Working directory is '/home/runner/work/RMS/RMS'
2025-07-03T08:04:05.5317496Z [command]/usr/bin/git version
2025-07-03T08:04:05.5328285Z git version 2.49.0
2025-07-03T08:04:05.5358694Z ##[endgroup]
2025-07-03T08:04:05.5375621Z Temporarily overriding HOME='/home/runner/work/_temp/85996322-904b-4ccb-830b-006a287533cf' before making global git config changes
2025-07-03T08:04:05.5378885Z Adding repository directory to the temporary git global config as a safe directory
2025-07-03T08:04:05.5382976Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/RMS/RMS
2025-07-03T08:04:05.5422936Z Deleting the contents of '/home/runner/work/RMS/RMS'
2025-07-03T08:04:05.5427861Z ##[group]Initializing the repository
2025-07-03T08:04:05.5433242Z [command]/usr/bin/git init /home/runner/work/RMS/RMS
2025-07-03T08:04:05.5514918Z hint: Using 'master' as the name for the initial branch. This default branch name
2025-07-03T08:04:05.5517280Z hint: is subject to change. To configure the initial branch name to use in all
2025-07-03T08:04:05.5518424Z hint: of your new repositories, which will suppress this warning, call:
2025-07-03T08:04:05.5518994Z hint:
2025-07-03T08:04:05.5519405Z hint: 	git config --global init.defaultBranch <name>
2025-07-03T08:04:05.5520162Z hint:
2025-07-03T08:04:05.5520748Z hint: Names commonly chosen instead of 'master' are 'main', 'trunk' and
2025-07-03T08:04:05.5521519Z hint: 'development'. The just-created branch can be renamed via this command:
2025-07-03T08:04:05.5522099Z hint:
2025-07-03T08:04:05.5522400Z hint: 	git branch -m <name>
2025-07-03T08:04:05.5526838Z Initialized empty Git repository in /home/runner/work/RMS/RMS/.git/
2025-07-03T08:04:05.5539919Z [command]/usr/bin/git remote add origin https://github.com/NtFelix/RMS
2025-07-03T08:04:05.5577722Z ##[endgroup]
2025-07-03T08:04:05.5578821Z ##[group]Disabling automatic garbage collection
2025-07-03T08:04:05.5584700Z [command]/usr/bin/git config --local gc.auto 0
2025-07-03T08:04:05.5616973Z ##[endgroup]
2025-07-03T08:04:05.5617651Z ##[group]Setting up auth
2025-07-03T08:04:05.5627521Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-07-03T08:04:05.5659953Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-07-03T08:04:05.6018305Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-07-03T08:04:05.6056016Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-07-03T08:04:05.6289438Z [command]/usr/bin/git config --local http.https://github.com/.extraheader AUTHORIZATION: basic ***
2025-07-03T08:04:05.6334696Z ##[endgroup]
2025-07-03T08:04:05.6335505Z ##[group]Fetching the repository
2025-07-03T08:04:05.6345470Z [command]/usr/bin/git -c protocol.version=2 fetch --no-tags --prune --no-recurse-submodules --depth=1 origin +b561099fefff1e1508e9e03cc9c2d51a20ca3d79:refs/remotes/pull/247/merge
2025-07-03T08:04:06.0591483Z From https://github.com/NtFelix/RMS
2025-07-03T08:04:06.0592205Z  * [new ref]         b561099fefff1e1508e9e03cc9c2d51a20ca3d79 -> pull/247/merge
2025-07-03T08:04:06.0630882Z ##[endgroup]
2025-07-03T08:04:06.0633731Z ##[group]Determining the checkout info
2025-07-03T08:04:06.0635153Z ##[endgroup]
2025-07-03T08:04:06.0637388Z [command]/usr/bin/git sparse-checkout disable
2025-07-03T08:04:06.0681147Z [command]/usr/bin/git config --local --unset-all extensions.worktreeConfig
2025-07-03T08:04:06.0709149Z ##[group]Checking out the ref
2025-07-03T08:04:06.0713934Z [command]/usr/bin/git checkout --progress --force refs/remotes/pull/247/merge
2025-07-03T08:04:06.0901141Z Note: switching to 'refs/remotes/pull/247/merge'.
2025-07-03T08:04:06.0903599Z 
2025-07-03T08:04:06.0904177Z You are in 'detached HEAD' state. You can look around, make experimental
2025-07-03T08:04:06.0905569Z changes and commit them, and you can discard any commits you make in this
2025-07-03T08:04:06.0908031Z state without impacting any branches by switching back to a branch.
2025-07-03T08:04:06.0910757Z 
2025-07-03T08:04:06.0911114Z If you want to create a new branch to retain commits you create, you may
2025-07-03T08:04:06.0911855Z do so (now or later) by using -c with the switch command. Example:
2025-07-03T08:04:06.0912263Z 
2025-07-03T08:04:06.0912431Z   git switch -c <new-branch-name>
2025-07-03T08:04:06.0912713Z 
2025-07-03T08:04:06.0912868Z Or undo this operation with:
2025-07-03T08:04:06.0913138Z 
2025-07-03T08:04:06.0913266Z   git switch -
2025-07-03T08:04:06.0913482Z 
2025-07-03T08:04:06.0916979Z Turn off this advice by setting config variable advice.detachedHead to false
2025-07-03T08:04:06.0917570Z 
2025-07-03T08:04:06.0918132Z HEAD is now at b561099 Merge d13d955d2335007c4a27cf930ae8979e417aa517 into 7d95cb47c526dc38811778a0145d370107811599
2025-07-03T08:04:06.0919873Z ##[endgroup]
2025-07-03T08:04:06.0951269Z [command]/usr/bin/git log -1 --format=%H
2025-07-03T08:04:06.0974544Z b561099fefff1e1508e9e03cc9c2d51a20ca3d79
2025-07-03T08:04:06.1197437Z ##[group]Run actions/setup-node@v4
2025-07-03T08:04:06.1197715Z with:
2025-07-03T08:04:06.1197896Z   node-version: 20
2025-07-03T08:04:06.1198099Z   always-auth: false
2025-07-03T08:04:06.1198348Z   check-latest: false
2025-07-03T08:04:06.1198668Z   token: ***
2025-07-03T08:04:06.1198857Z ##[endgroup]
2025-07-03T08:04:06.3241765Z Found in cache @ /opt/hostedtoolcache/node/20.19.2/x64
2025-07-03T08:04:06.3243015Z ##[group]Environment details
2025-07-03T08:04:08.2455834Z node: v20.19.2
2025-07-03T08:04:08.2457357Z npm: 10.8.2
2025-07-03T08:04:08.2457667Z yarn: 1.22.22
2025-07-03T08:04:08.2459354Z ##[endgroup]
2025-07-03T08:04:08.2571840Z ##[group]Run if [ -f yarn.lock ]; then
2025-07-03T08:04:08.2572210Z [36;1mif [ -f yarn.lock ]; then[0m
2025-07-03T08:04:08.2572699Z [36;1m  yarn install --frozen-lockfile[0m
2025-07-03T08:04:08.2572964Z [36;1melse[0m
2025-07-03T08:04:08.2573148Z [36;1m  npm ci[0m
2025-07-03T08:04:08.2573324Z [36;1mfi[0m
2025-07-03T08:04:08.2681619Z shell: /usr/bin/bash -e {0}
2025-07-03T08:04:08.2681900Z ##[endgroup]
2025-07-03T08:04:13.9772979Z npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
2025-07-03T08:04:15.6319354Z npm warn deprecated critters@0.0.25: Ownership of Critters has moved to the Nuxt team, who will be maintaining the project going forward. If you'd like to keep using Critters, please switch to the actively-maintained fork at https://github.com/danielroe/beasties
2025-07-03T08:04:15.9539642Z npm warn deprecated @supabase/auth-helpers-shared@0.7.0: This package is now deprecated - please use the @supabase/ssr package instead.
2025-07-03T08:04:16.8792814Z npm warn deprecated @supabase/auth-helpers-nextjs@0.10.0: This package is now deprecated - please use the @supabase/ssr package instead.
2025-07-03T08:04:17.4470326Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2025-07-03T08:04:17.5085671Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2025-07-03T08:04:17.5725122Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2025-07-03T08:04:17.6958220Z npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
2025-07-03T08:04:30.7593476Z 
2025-07-03T08:04:30.7594247Z added 763 packages, and audited 764 packages in 22s
2025-07-03T08:04:30.7594681Z 
2025-07-03T08:04:30.7594961Z 100 packages are looking for funding
2025-07-03T08:04:30.7595447Z   run `npm fund` for details
2025-07-03T08:04:30.7595736Z 
2025-07-03T08:04:30.7595926Z 1 low severity vulnerability
2025-07-03T08:04:30.7596185Z 
2025-07-03T08:04:30.7596379Z To address all issues, run:
2025-07-03T08:04:30.7596767Z   npm audit fix
2025-07-03T08:04:30.7596960Z 
2025-07-03T08:04:30.7597147Z Run `npm audit` for details.
2025-07-03T08:04:30.7984171Z ##[group]Run npm run build
2025-07-03T08:04:30.7984467Z [36;1mnpm run build[0m
2025-07-03T08:04:30.8049375Z shell: /usr/bin/bash -e {0}
2025-07-03T08:04:30.8049627Z ##[endgroup]
2025-07-03T08:04:30.9447464Z 
2025-07-03T08:04:30.9448284Z > my-v0-project@0.1.0 build
2025-07-03T08:04:30.9448938Z > next build
2025-07-03T08:04:30.9451692Z 
2025-07-03T08:04:31.5447325Z ⚠ No build cache found. Please configure build caching for faster rebuilds. Read more: https://nextjs.org/docs/messages/no-cache
2025-07-03T08:04:31.5544690Z Attention: Next.js now collects completely anonymous telemetry regarding usage.
2025-07-03T08:04:31.5557557Z This information is used to shape Next.js' roadmap and prioritize features.
2025-07-03T08:04:31.5559543Z You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
2025-07-03T08:04:31.5568190Z https://nextjs.org/telemetry
2025-07-03T08:04:31.5568502Z 
2025-07-03T08:04:31.6087737Z    ▲ Next.js 15.3.1
2025-07-03T08:04:31.6088534Z    - Environments: .env
2025-07-03T08:04:31.6091893Z    - Experiments (use with caution):
2025-07-03T08:04:31.6093800Z      ✓ optimizeCss
2025-07-03T08:04:31.6094332Z      ✓ scrollRestoration
2025-07-03T08:04:31.6094602Z 
2025-07-03T08:04:31.6700682Z    Creating an optimized production build ...
2025-07-03T08:05:19.6050917Z  ✓ Compiled successfully in 47s
2025-07-03T08:05:19.6099411Z    Linting and checking validity of types ...
2025-07-03T08:05:33.4354426Z    Collecting page data ...
2025-07-03T08:05:33.9633209Z  ⚠ Using edge runtime on a page currently disables static generation for that page
2025-07-03T08:05:36.8938466Z    Generating static pages (0/14) ...
2025-07-03T08:05:38.0810763Z    Generating static pages (3/14) 
2025-07-03T08:05:38.0812104Z    Generating static pages (6/14) 
2025-07-03T08:05:38.2456404Z    Generating static pages (10/14) 
2025-07-03T08:05:38.2462244Z  ✓ Generating static pages (14/14)
2025-07-03T08:05:38.5805709Z    Finalizing page optimization ...
2025-07-03T08:05:38.5807440Z    Collecting build traces ...
2025-07-03T08:05:46.7836306Z 
2025-07-03T08:05:46.7952120Z Route (app)                                 Size  First Load JS
2025-07-03T08:05:46.7954503Z ┌ ○ /                                      201 B         241 kB
2025-07-03T08:05:46.7955328Z ├ ○ /_not-found                            990 B         103 kB
2025-07-03T08:05:46.7956205Z ├ ƒ /api/export                            210 B         102 kB
2025-07-03T08:05:46.7956989Z ├ ƒ /api/finanzen                          210 B         102 kB
2025-07-03T08:05:46.7960302Z ├ ƒ /api/finanzen/[id]                     210 B         102 kB
2025-07-03T08:05:46.7961256Z ├ ƒ /api/haeuser                           210 B         102 kB
2025-07-03T08:05:46.7962101Z ├ ƒ /api/mieter                            210 B         102 kB
2025-07-03T08:05:46.7963064Z ├ ƒ /api/stripe/cancel-subscription        210 B         102 kB
2025-07-03T08:05:46.7963974Z ├ ƒ /api/stripe/checkout-session           210 B         102 kB
2025-07-03T08:05:46.7964799Z ├ ƒ /api/stripe/customer-portal            210 B         102 kB
2025-07-03T08:05:46.7965633Z ├ ƒ /api/stripe/plans                      210 B         102 kB
2025-07-03T08:05:46.7966446Z ├ ƒ /api/stripe/verify-session             210 B         102 kB
2025-07-03T08:05:46.7967276Z ├ ƒ /api/stripe/webhook                    210 B         102 kB
2025-07-03T08:05:46.7968073Z ├ ƒ /api/todos                             210 B         102 kB
2025-07-03T08:05:46.7968820Z ├ ƒ /api/todos/[id]                        210 B         102 kB
2025-07-03T08:05:46.7969561Z ├ ƒ /api/user/profile                      210 B         102 kB
2025-07-03T08:05:46.7970551Z ├ ƒ /api/wohnungen                         210 B         102 kB
2025-07-03T08:05:46.7971386Z ├ ƒ /auth/callback                         210 B         102 kB
2025-07-03T08:05:46.7972268Z ├ ○ /auth/login                          4.21 kB         156 kB
2025-07-03T08:05:46.7973527Z ├ ○ /auth/register                        4.3 kB         156 kB
2025-07-03T08:05:46.7974570Z ├ ○ /auth/reset-password                 4.09 kB         155 kB
2025-07-03T08:05:46.7975460Z ├ ○ /auth/update-password                4.07 kB         152 kB
2025-07-03T08:05:46.7976347Z ├ ƒ /betriebskosten                      19.8 kB         208 kB
2025-07-03T08:05:46.7977213Z ├ ○ /checkout/cancel                     1.91 kB         114 kB
2025-07-03T08:05:46.7978053Z ├ ○ /checkout/success                    3.41 kB         116 kB
2025-07-03T08:05:46.7978891Z ├ ƒ /finanzen                            17.7 kB         273 kB
2025-07-03T08:05:46.7980098Z ├ ƒ /haeuser                             8.99 kB         148 kB
2025-07-03T08:05:46.7980915Z ├ ƒ /home                                5.24 kB         292 kB
2025-07-03T08:05:46.7981677Z ├ ○ /landing                               202 B         241 kB
2025-07-03T08:05:46.7982476Z ├ ƒ /mieter                              5.95 kB         231 kB
2025-07-03T08:05:46.7983328Z ├ ○ /modern/documentation                4.98 kB         231 kB
2025-07-03T08:05:46.7984181Z ├ ○ /subscription                        6.93 kB         116 kB
2025-07-03T08:05:46.7985052Z ├ ○ /subscription-locked                 3.54 kB         117 kB
2025-07-03T08:05:46.8008250Z ├ ƒ /todos                               9.89 kB         161 kB
2025-07-03T08:05:46.8009013Z └ ƒ /wohnungen                           8.03 kB         186 kB
2025-07-03T08:05:46.8009858Z + First Load JS shared by all             102 kB
2025-07-03T08:05:46.8010495Z   ├ chunks/1317-4be7c8f2dda6a784.js      46.4 kB
2025-07-03T08:05:46.8011070Z   ├ chunks/4bd1b696-86b7f7b384ded616.js  53.2 kB
2025-07-03T08:05:46.8011638Z   └ other shared chunks (total)          2.24 kB
2025-07-03T08:05:46.8011939Z 
2025-07-03T08:05:46.8011949Z 
2025-07-03T08:05:46.8012295Z ƒ Middleware                             66.2 kB
2025-07-03T08:05:46.8012866Z 
2025-07-03T08:05:46.8013181Z ○  (Static)   prerendered as static content
2025-07-03T08:05:46.8013755Z ƒ  (Dynamic)  server-rendered on demand
2025-07-03T08:05:46.8014061Z 
2025-07-03T08:05:46.9056326Z ##[group]Run npm run export
2025-07-03T08:05:46.9056787Z [36;1mnpm run export[0m
2025-07-03T08:05:46.9140882Z shell: /usr/bin/bash -e {0}
2025-07-03T08:05:46.9141275Z ##[endgroup]
2025-07-03T08:05:47.0592050Z npm error Missing script: "export"
2025-07-03T08:05:47.0595888Z npm error
2025-07-03T08:05:47.0596304Z npm error Did you mean this?
2025-07-03T08:05:47.0596953Z npm error   npm explore # Browse an installed package
2025-07-03T08:05:47.0597479Z npm error
2025-07-03T08:05:47.0597931Z npm error To see a list of scripts, run:
2025-07-03T08:05:47.0598421Z npm error   npm run
2025-07-03T08:05:47.0611271Z npm error A complete log of this run can be found in: /home/runner/.npm/_logs/2025-07-03T08_05_46_988Z-debug-0.log
2025-07-03T08:05:47.0663485Z ##[error]Process completed with exit code 1.
2025-07-03T08:05:47.0746969Z Post job cleanup.
2025-07-03T08:05:47.1717538Z [command]/usr/bin/git version
2025-07-03T08:05:47.1757548Z git version 2.49.0
2025-07-03T08:05:47.1815154Z Temporarily overriding HOME='/home/runner/work/_temp/dca911a9-5b28-4ab1-aa7b-6558374fcd05' before making global git config changes
2025-07-03T08:05:47.1817173Z Adding repository directory to the temporary git global config as a safe directory
2025-07-03T08:05:47.1821392Z [command]/usr/bin/git config --global --add safe.directory /home/runner/work/RMS/RMS
2025-07-03T08:05:47.1859365Z [command]/usr/bin/git config --local --name-only --get-regexp core\.sshCommand
2025-07-03T08:05:47.1895411Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
2025-07-03T08:05:47.2133687Z [command]/usr/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
2025-07-03T08:05:47.2157116Z http.https://github.com/.extraheader
2025-07-03T08:05:47.2172586Z [command]/usr/bin/git config --local --unset-all http.https://github.com/.extraheader
2025-07-03T08:05:47.2206377Z [command]/usr/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
2025-07-03T08:05:47.2552627Z Cleaning up orphan processes