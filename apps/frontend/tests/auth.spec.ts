import { expect, test } from '@playwright/test'

test.describe('Auth', () => {
  test('sign up', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/signin')

    await page.getByTestId('signup-link').click()
    await expect(page).toHaveURL('/signup')

    await page.getByTestId('email-input').fill('test@gmail.com')
    await page.getByTestId('password-input').fill('mypassword')
    await page.getByTestId('confirm-password-input').fill('mypassword')

    await page.getByTestId('signup-submit').click()

    await expect(page).toHaveURL('/')

    await page.getByTestId('signout-btn').click()
    await expect(page).toHaveURL('/signin')
  })

  test('sign in', async ({ page }) => {
    await page.goto('/signup')

    await page.getByTestId('signin-link').click()
    await expect(page).toHaveURL('/signin')

    await page.getByTestId('email-input').fill('test@gmail.com')
    await page.getByTestId('password-input').fill('mypassword')

    await page.getByTestId('signin-submit').click()

    await expect(page).toHaveURL('/')

    await page.getByTestId('signout-btn').click()
    await expect(page).toHaveURL('/signin')
  })
})
