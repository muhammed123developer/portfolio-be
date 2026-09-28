import { param } from 'express-validator'

import { IMAGE_KINDS } from '../services/upload.service'

export const uploadImageValidator = [
  param('kind')
    .isIn(IMAGE_KINDS)
    .withMessage(`Upload kind must be one of: ${IMAGE_KINDS.join(', ')}`),
]
