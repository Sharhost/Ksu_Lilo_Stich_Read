name: Generate voice 
on:
  workflow_dispatch:

jobs:
  voice:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Generate SpeechKit audio
        env:
          SPEECHKIT_KEY: ${{ secrets.SPEECHKIT_KEY }}
          FOLDER_ID: ${{ secrets.FOLDER_ID }}
        run: node tools/voicegen.mjs
      - name: Commit audio files
        if: always()
        run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add assets/voice
          git diff --cached --quiet || git commit -m "Озвучка SpeechKit"
          git push
