.PHONY: audit
# Audit-only target; invoke from repository root with `make -f audit/Makefile audit`.
audit:
	@echo "See audit/reports/AUDIT_REPORT.md"
	@npm.cmd --prefix web test -- --run
