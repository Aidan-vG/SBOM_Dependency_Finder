# SBOM Dependency Finder for Mendix

## Overview

A tool designed to streamline the troubleshooting process for Mendix customer support engineers when investigating vulnerable JAR dependencies flagged in security scans.

## Problem Statement

When customers report vulnerable JAR dependencies discovered in security scans of their Mendix Studio Pro projects, it's often unclear which Mendix Marketplace widget or module contains the flagged dependency. This challenge is particularly acute for transitive (indirect) dependencies, where the vulnerable JAR is not directly included but is brought in as a dependency of another dependency.

The current manual investigation process is time-consuming and delays issue resolution, impacting both customer satisfaction and support efficiency.

## Solution

This tool enables support engineers to quickly identify the source of any dependency within a Mendix project by:

1. **Accepting user input**: The name of a specific JAR dependency and an SBOM (Software Bill of Materials) file from a Mendix Studio Pro project
2. **AI-powered analysis**: Using an AI agent to scan and analyze the SBOM structure
3. **Dependency tree visualization**: Providing a complete dependency tree showing all levels from the flagged dependency up to the parent Mendix Marketplace widget/module

## Benefits

- **Faster troubleshooting**: Dramatically reduces time spent identifying dependency sources
- **Complete visibility**: Shows the full dependency chain, including transitive dependencies
- **Improved support efficiency**: Enables support engineers to quickly advise customers on which widgets/modules need updates or replacement
- **Better security posture**: Helps customers address vulnerabilities more quickly by identifying exact sources

## Target Users

- Mendix Customer Support Engineers
- Mendix Developers investigating security vulnerabilities
- Security teams performing dependency audits on Mendix projects
