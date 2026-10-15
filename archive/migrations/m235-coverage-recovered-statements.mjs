#!/usr/bin/env node
// GOALS step 5, C3/C10/C13: recover exact source statements and remove editorial embellishments.
import { applyCoveragePacket } from './coverage-packet.mjs';
applyCoveragePacket('recovery', '97cd8ee8dd0389e9c3e6759dfd9c56577e692da23e3c25d7663eb99d2c18bc75', 'm235-coverage-recovered-statements');
