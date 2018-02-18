'use strict'

var ContactType = {
    verified: 0,    // Contact is in User's contact list
    unverified: 1,  // Contact is in User's contact list but hasn't been approved yet
    unknown: 2      // Contact is not in User's contacts list
}

module.exports = ContactType;