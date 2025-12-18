# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a NetSuite customization repository for the University of San Carlos. It contains SuiteScript files for custom functionality within the NetSuite ERP system.

## Technology Stack

- **Platform**: NetSuite (Oracle)
- **Language**: SuiteScript 2.x (JavaScript-based)
- **Templates**: Freemarker XML for Advanced PDF/HTML templates

## Repository Structure

- `Sandbox/` - Development/sandbox environment scripts
  - `Scripts/` - SuiteScript files (Client Scripts, User Event Scripts, Suitelets, etc.)
  - `Prints/` - Print templates and Suitelet-based print solutions

## SuiteScript Conventions

- Scripts use the `Softype_` prefix for naming
- Script types are indicated by suffix: `_CS` (Client Script), `_ST` (Suitelet), `_UE` (User Event)
- Use JSDoc annotations with `@NApiVersion`, `@NScriptType`, and `@NModuleScope` for script metadata

## Common NetSuite Modules

When working with SuiteScript, common module imports include:
- `N/record` - Record operations
- `N/search` - Saved searches
- `N/ui/serverWidget` - UI components for Suitelets
- `N/render` - PDF/HTML rendering
- `N/file` - File operations
