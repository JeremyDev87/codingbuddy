<p align="center">
  <a href="../plugin-troubleshooting.md">English</a> |
  <a href="plugin-troubleshooting.md">한국어</a> |
  <a href="../zh-CN/plugin-troubleshooting.md">中文</a> |
  <a href="../ja/plugin-troubleshooting.md">日本語</a> |
  <a href="../es/plugin-troubleshooting.md">Español</a> |
  <a href="../pt-BR/plugin-troubleshooting.md">Português</a>
</p>

# CodingBuddy 문제 해결 가이드

CodingBuddy Claude Code 플러그인 사용 시 발생하는 일반적인 문제에 대한 해결책입니다.

## 설치 문제

### Claude Code에 플러그인이 표시되지 않음

**증상**: 설치 후 `claude plugin list`에 codingbuddy가 표시되지 않음.

**해결 방법**:

1. **설치 완료 확인**
   ```bash
   # 플러그인 파일 존재 확인
   ls ~/.claude/plugins/codingbuddy/
   ```

2. **플러그인 재설치**
   ```bash
   claude plugin uninstall codingbuddy@jeremydev87
   claude plugin install codingbuddy@jeremydev87
   ```

3. **Claude Code 버전 확인**
   ```bash
   claude --version
   # 플러그인 시스템은 Claude Code 1.0+ 필요
   ```

4. **Claude Code 재시작**
   ```bash
   # Claude Code를 완전히 종료하고 재시작
   claude
   ```

### npm 설치 실패

**증상**: `npm install -g codingbuddy-claude-plugin`이 오류와 함께 실패함.

**해결 방법**:

1. **권한 오류 (EACCES)**
   ```bash
   # 방법 A: Node 버전 매니저 사용
   # nvm 설치 후:
   nvm install --lts
   npm install -g codingbuddy-claude-plugin

   # 방법 B: npm prefix 수정
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   npm install -g codingbuddy-claude-plugin
   ```

2. **네트워크 오류**
   ```bash
   # npm 레지스트리 확인
   npm config get registry
   # https://registry.npmjs.org/ 여야 함

   # 상세 로깅으로 시도
   npm install -g codingbuddy-claude-plugin --verbose
   ```

3. **Node 버전이 너무 낮음**
   ```bash
   node --version
   # Node.js 18+ 필요
   # 필요시 Node.js 업데이트
   ```

---

## 마켓플레이스 문제

### "Invalid marketplace schema" 오류

**증상**: `claude marketplace add` 실행 시 다음 오류 발생:
```
✘ Failed to add marketplace: Invalid marketplace schema from URL: : Invalid input: expected object, received string
```

**원인**: GitHub 저장소 형식 대신 URL 형식을 사용함.

**해결 방법**:
```bash
# 잘못된 형식 (URL 형식 - 더 이상 지원 안 함)
claude marketplace add https://jeremydev87.github.io/codingbuddy

# 올바른 형식 (GitHub 저장소 형식)
claude marketplace add JeremyDev87/codingbuddy
```

### URL 형식에서 마이그레이션

이전에 URL 형식으로 마켓플레이스를 추가했다면:

```bash
# 1. 기존 마켓플레이스 제거
claude marketplace remove https://jeremydev87.github.io/codingbuddy

# 2. 올바른 형식으로 추가
claude marketplace add JeremyDev87/codingbuddy

# 3. 플러그인 재설치
claude plugin install codingbuddy@jeremydev87
```

### 마켓플레이스를 찾을 수 없음

**증상**: `claude marketplace add JeremyDev87/codingbuddy` 실행 시 "not found" 오류

**해결 방법**:

1. **철자와 대소문자 확인**
   - GitHub 사용자명: `JeremyDev87` (대소문자 구분)
   - 저장소: `codingbuddy`

2. **네트워크 연결 확인**
   ```bash
   curl -I https://github.com/JeremyDev87/codingbuddy
   ```

3. **Claude Code 업데이트**
   ```bash
   npm update -g @anthropic-ai/claude-code
   ```

---

## MCP 연결 문제

### MCP 서버 연결 안 됨

**증상**: 워크플로우 명령어(PLAN, ACT, EVAL)가 제대로 활성화되지 않고 에이전트가 표시되지 않음.

**진단**:
```bash
# codingbuddy CLI 설치 확인
which codingbuddy
codingbuddy --version

# MCP 설정 확인
cat ~/.claude/settings.json | grep -A5 codingbuddy
```

**해결 방법**:

1. **MCP 서버 설치**
   ```bash
   npm install -g codingbuddy
   ```

2. **MCP 설정 추가**

   `~/.claude/settings.json` 편집:
   ```json
   {
     "mcpServers": {
       "codingbuddy": {
         "command": "codingbuddy",
         "args": ["mcp"]
       }
     }
   }
   ```

3. **Claude Code 재시작**
   ```bash
   # 종료 후 재시작
   claude
   ```

### MCP 도구를 사용할 수 없음

**증상**: `/mcp` 명령어에 CodingBuddy 도구가 표시되지 않음.

**해결 방법**:

1. **MCP 서버 실행 확인**
   ```bash
   # 별도의 터미널에서 실행:
   codingbuddy
   # 오류 없이 시작되어야 함
   ```

2. **PATH에 codingbuddy 포함 확인**
   ```bash
   echo $PATH
   which codingbuddy
   # 찾을 수 없으면 PATH에 추가
   ```

3. **충돌하는 MCP 서버 확인**
   ```bash
   cat ~/.claude/settings.json
   # codingbuddy에 대한 중복 항목이 없는지 확인
   ```

### "Command not found: codingbuddy"

**증상**: MCP가 `codingbuddy`를 실행하려 하지만 찾을 수 없음.

**해결 방법**:

1. **전역 npm bin을 PATH에 추가**
   ```bash
   # npm의 경우
   export PATH="$(npm config get prefix)/bin:$PATH"

   # yarn의 경우
   export PATH="$(yarn global bin):$PATH"
   ```

2. **MCP 설정에 절대 경로 사용**
   ```json
   {
     "mcpServers": {
       "codingbuddy": {
         "command": "/usr/local/bin/codingbuddy",
         "args": ["mcp"]
       }
     }
   }
   ```

---

## 워크플로우 문제

### PLAN/ACT/EVAL 키워드가 인식되지 않음

**증상**: "PLAN implement X"를 입력해도 워크플로우 모드가 트리거되지 않음.

**해결 방법**:

1. **키워드가 메시지 시작에 있는지 확인**
   ```
   # 올바름
   PLAN 사용자 로그인 구현

   # 잘못됨 - 키워드가 시작에 없음
   PLAN으로 사용자 로그인 구현해줘
   ```

2. **대문자 또는 한국어 키워드 사용**
   ```
   PLAN ...
   계획 ...
   ```

3. **MCP 연결 확인**
   - `/mcp`를 입력하여 사용 가능한 도구 확인
   - `parse_mode` 도구가 표시되어야 함

### 컨텍스트가 유지되지 않음

**증상**: ACT 모드가 PLAN 결정사항을 기억하지 못함.

**해결 방법**:

1. **컨텍스트 파일 존재 확인**
   ```bash
   cat docs/codingbuddy/context.md
   ```

2. **PLAN이 제대로 완료되었는지 확인**
   - PLAN 모드가 컨텍스트 파일을 생성함
   - 중단된 경우 PLAN으로 다시 시작

3. **파일 권한 확인**
   ```bash
   ls -la docs/codingbuddy/
   # 쓰기 권한 확인
   ```

### AUTO 모드가 멈추지 않음

**증상**: 문제가 수정되었는데도 AUTO 모드가 계속 반복됨.

**해결 방법**:

1. **반복 제한 확인**
   - 기본값은 5회 반복
   - Critical=0 AND High=0일 때 AUTO 중지

2. **EVAL 결과 검토**
   - 일부 문제가 반복될 수 있음
   - 증상이 아닌 근본 원인 해결

3. **수동 개입**
   - 아무 메시지나 입력하여 AUTO 중단
   - 결과 검토 후 필요시 재시작

---

## 성능 문제

### 응답 시간이 느림

**증상**: 워크플로우 모드에서 Claude 응답이 오래 걸림.

**해결 방법**:

1. **작업 단순화**
   - 복잡한 작업을 작은 단위로 분할
   - 한 번에 하나의 기능에 대해 PLAN 사용

2. **전문가 에이전트 줄이기**
   - `codingbuddy.config.json`에서 전문가 수 줄이기
   ```javascript
   module.exports = {
     specialists: ['security-specialist']  // 필수적인 것만
   };
   ```

3. **컨텍스트 크기 확인**
   - 큰 컨텍스트 파일은 처리 속도 저하
   - 새 기능에는 새 PLAN으로 시작

### 토큰 사용량이 높음

**증상**: 컨텍스트 제한에 빨리 도달함.

**해결 방법**:

1. **집중된 프롬프트 사용**
   ```
   # 더 나음
   PLAN 등록에 이메일 유효성 검사 추가

   # 덜 효율적
   PLAN 전체 인증 모듈 검토하고 유효성 검사 추가
   ```

2. **컨텍스트가 자연스럽게 압축되도록 허용**
   - Claude Code가 자동으로 이전 컨텍스트 요약
   - 이전 컨텍스트를 수동으로 반복하지 않기

---

## 설정 문제

### 프로젝트 설정이 로드되지 않음

**증상**: `codingbuddy.config.json` 설정이 적용되지 않음.

**해결 방법**:

1. **파일 위치 확인**
   - 프로젝트 루트에 있어야 함
   - 정확히 `codingbuddy.config.json`로 명명

2. **구문 확인**
   ```bash
   node -e "console.log(require('./codingbuddy.config.json'))"
   ```

3. **내보내기 형식 확인**
   ```javascript
   // 올바름
   module.exports = { language: 'ko' };

   // 잘못됨
   export default { language: 'ko' };
   ```

### 응답 언어가 잘못됨

**증상**: Claude가 잘못된 언어로 응답함.

**해결 방법**:

1. **설정에서 언어 설정**
   ```javascript
   // codingbuddy.config.json
   module.exports = {
     language: 'ko'  // 'en', 'ko', 'ja', 'zh', 'es'
   };
   ```

2. **환경 변수 사용**
   ```bash
   export CODINGBUDDY_LANGUAGE=ko
   ```

3. **한국어 키워드 사용**
   - 한국어로 시작: `계획 사용자 로그인 구현`
   - Claude가 한국어로 응답함

---

## 디버그 모드

### 상세 로깅 활성화

상세한 디버깅을 위해:

```bash
# 디버그 출력으로 MCP 서버 실행
CODINGBUDDY_DEBUG=true codingbuddy
```

### MCP 통신 확인

```bash
# Claude Code에서 MCP 상태 확인
/mcp

# 다음이 표시되어야 함:
# - codingbuddy 서버 상태
# - 사용 가능한 도구
# - 오류가 있으면 마지막 오류
```

### 컨텍스트 문서 검토

```bash
# 유지된 컨텍스트 확인
cat docs/codingbuddy/context.md

# 다음을 확인:
# - 이전 PLAN 결정사항
# - ACT 진행 상황
# - EVAL 결과
```

---

## 도움 받기

### 이슈 리포트

1. **GitHub Issues**: [github.com/JeremyDev87/codingbuddy/issues](https://github.com/JeremyDev87/codingbuddy/issues)

2. **리포트에 포함할 내용**:
   - Claude Code 버전 (`claude --version`)
   - 플러그인 버전 (plugin.json에서)
   - MCP 서버 버전 (`codingbuddy --version`)
   - 재현 단계
   - 오류 메시지

### 문서 확인

- [설치 가이드](./plugin-guide.md)
- [아키텍처](./plugin-architecture.md)
- [FAQ](./plugin-faq.md)

---

## 빠른 진단 체크리스트

```
[ ] Node.js 18+ 설치됨
[ ] Claude Code 1.0+ 설치됨
[ ] `claude plugin list`에 플러그인 표시됨
[ ] MCP 서버 설치됨 (`which codingbuddy`)
[ ] settings.json에 MCP 설정 있음
[ ] `/mcp`로 도구 확인 가능
[ ] PLAN 키워드가 모드 트리거함
[ ] PLAN 후 컨텍스트 파일 생성됨
```

---

<sub>🤖 이 문서는 AI의 도움을 받아 번역되었습니다. 오류나 개선 사항이 있으면 [GitHub Issues](https://github.com/JeremyDev87/codingbuddy/issues)에 알려주세요.</sub>
