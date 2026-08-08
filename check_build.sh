#!/bin/bash
cargo check --workspace 2>&1 | tee workspace_compile.log
