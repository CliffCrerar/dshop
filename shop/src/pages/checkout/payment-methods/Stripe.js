import React, { useState, useEffect } from 'react'
import get from 'lodash/get'

import { formFeedback } from 'utils/formHelpers'
import useConfig from 'utils/useConfig'
import useIsMobile from 'utils/useIsMobile'
import { useStateValue } from 'data/state'

import { CardElement, injectStripe } from 'react-stripe-elements'

const PayWithStripe = injectStripe(
  ({ stripe, submit, encryptedData, onChange }) => {
    const { config } = useConfig()
    const isMobile = useIsMobile()
    const [{ cart }, dispatch] = useStateValue()
    const [paymentReq, setPaymentReq] = useState()
    const [formData, setFormData] = useState({})

    const paymentMethods = get(config, 'paymentMethods', [])
    const stripeSelected = get(cart, 'paymentMethod.id') === 'stripe'
    const stripePaymentMethod = paymentMethods.find((o) => o.id === 'stripe')

    const Feedback = formFeedback(formData)

    useEffect(() => {
      if (!stripe || !stripeSelected || paymentReq) {
        return
      }
      console.log('Make Stripe payment request...')

      try {
        const paymentRequest = stripe.paymentRequest({
          country: 'US',
          currency: 'usd',
          total: { label: 'Item Total', amount: cart.subTotal },
          requestPayerName: true,
          requestPayerEmail: true,
          requestShipping: true,
          shippingOptions: [cart.shipping]
        })

        paymentRequest.on('token', ({ complete, token, ...data }) => {
          console.log('Received Stripe token: ', token)
          console.log('Received customer information: ', data)
          complete('success')
        })

        setPaymentReq(paymentRequest)
      } catch (e) {
        console.log('paymentRequest error', e)
      }
      onChange({ disabled: false })
    }, [stripe, stripeSelected, paymentReq])

    useEffect(() => {
      if (!stripe || !stripeSelected || !paymentReq || !submit) {
        return
      }

      fetch(`${config.backend}/pay`, {
        headers: {
          'content-type': 'application/json',
          authorization: `bearer ${config.backendAuthToken}`
        },
        credentials: 'include',
        method: 'POST',
        body: JSON.stringify({
          amount: cart.total,
          data: encryptedData.hash,
          listingId: config.listingId
        })
      })
        .then((res) => res.json())
        .then((json) => {
          if (!json.success) {
            setFormData({ ...formData, cardError: json.message })
            return
          }
          const { userInfo } = cart
          const shippingAddress = {
            line1: userInfo.address1,
            line2: userInfo.address2,
            city: userInfo.city,
            state: userInfo.province,
            postal_code: userInfo.zip
          }
          const shippingName = `${userInfo.firstName} ${userInfo.lastName}`
          let billingAddress = shippingAddress
          let billingName = shippingName
          if (userInfo.billingDifferent) {
            billingAddress = {
              line1: userInfo.billingAddress1,
              line2: userInfo.billingAddress2,
              city: userInfo.billingCity,
              state: userInfo.billingProvince,
              postal_code: userInfo.billingZip
            }
            billingName = `${userInfo.billingFirstName} ${userInfo.billingLastName}`
          }

          const cardData = {
            shipping: { name: shippingName, address: shippingAddress },
            payment_method_data: {
              billing_details: {
                name: billingName,
                email: cart.userInfo.email,
                address: billingAddress
              }
            }
          }
          stripe
            .handleCardPayment(json.client_secret, cardData)
            .then((result) => {
              if (result.error) {
                setFormData({ ...formData, cardError: result.error.message })
                onChange({ loading: false })
              } else {
                onChange({ tx: encryptedData.hash, loading: false })
              }
            })
            .catch((err) => {
              console.log(err)
              setFormData({
                ...formData,
                cardError: 'Payment server error. Please try again later.'
              })
              onChange({ loading: false })
            })
        })
    }, [stripe, stripeSelected, submit])

    return (
      <>
        <label
          className={`radio align-items-center${
            stripeSelected ? '' : ' inactive'
          }`}
        >
          <input
            type="radio"
            name="paymentMethod"
            checked={stripeSelected}
            onChange={() =>
              dispatch({
                type: 'updatePaymentMethod',
                method: stripePaymentMethod
              })
            }
          />
          Credit Card
          {isMobile ? null : (
            <div className="cards">
              <div className="visa" />
              <div className="master" />
              <div className="amex" />
              <div className="discover" />
              and more...
            </div>
          )}
        </label>
        {!stripeSelected ? null : (
          <div className="pl-4 pb-3 pt-3">
            <div className="form-row">
              <CardElement
                className="form-control"
                style={{ base: { fontSize: '16px', lineHeight: '24px' } }}
              />
              {Feedback('card')}
              <img
                src="images/powered_by_stripe.svg"
                className="ml-auto mt-2"
              />
            </div>
          </div>
        )}
      </>
    )
  }
)

export default PayWithStripe

require('react-styl')(`
`)