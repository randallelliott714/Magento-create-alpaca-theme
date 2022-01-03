import { exec } from 'child_process'

export function magentoUpgrade() {
  return new Promise((resolve, reject) => {
    exec('bin/magento setup:upgrade', (error) => {
      if (error) {
        reject(`error: ${error.message}`);
        return;
      }

      resolve('Magento instance upgraded');
    });
  });
};
