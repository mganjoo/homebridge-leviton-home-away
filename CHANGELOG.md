# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Fix race condition between external update to home/away status and internal state update. Now,
  explicitly update internal state whenever there is an external home/away status update.

## [1.0.2] - 2024-01-19

- Add more debug messages for socket connection.

## [1.0.1] - 2024-01-18

- Fix description of plugin.

## [1.0.0] - 2024-01-18

- Initial release, providing an on/off switch corresponding to Home/Away states.

[unreleased]: https://github.com/mganjoo/homebridge-leviton-home-away/compare/1.0.2...HEAD
[1.0.2]: https://github.com/mganjoo/homebridge-leviton-home-away/compare/1.0.1...1.0.2
[1.0.1]: https://github.com/mganjoo/homebridge-leviton-home-away/compare/1.0.0...1.0.1
[1.0.0]: https://github.com/mganjoo/homebridge-leviton-home-away/releases/tag/1.0.0
